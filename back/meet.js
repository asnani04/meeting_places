var async = require('async');
var googleMapsClient = require('@google/maps').createClient({
  key: 'AIzaSyBeWcVkl8kxqTdbvNjQfAtvJ0SlfBeXSEQ'
});

var sec = require('./smallest_enclosing_circle.js');
var typeOfPlace = 'restaurant';
var pref = 'waiting_time';

function createuser(listLoc, callback){
  googleMapsClient.geocode({
    address: listLoc
  }, function(err, response) {
    console.log("Inside func")
    console.log("createuser response: ", err, response)
    if(err){
      return callback(err, null);
    }
    // console.log(response.json.results);
    if (response.json.results.length == 0) {
      return callback(1, null);
    }
    var loc = response.json.results[0].geometry.location;
    return callback(null, {lat: loc.lat, lng: loc.lng});
    }
  );
}

function getLocations(listLocs, cb){
  console.log("Inside getlocations");
  // var locs = [];
  var count = 0;
  var len = listLocs.length;
  
  async.times(len, function(n, next){
    createuser(listLocs[n], function(err, resp){
      if (err) {
        console.log("I caught an error", err);
      }
      next(err, resp);
    })
  }, function(err, locs){
    if(err){
      console.log("this is the err", err, locs)
      return cb(err, null);
    }
    else{
      console.log("ListLoks: ", locs);
      return cb(null, locs);
    }
  })
}

module.exports = {
  findCandidates: function (listLocs, listCoords, type_of_place, preference, cb) {
    console.log("Listloc initial value: ", listLocs)
    for (var i=0; i<listLocs.length; i++) {
      listLocs[i] = listLocs[i].toLowerCase();
    }
    type_of_place = type_of_place.toLowerCase();
    preference = preference.toLowerCase();
    getLocations(listLocs, function(err, resp){
      if(err){
        console.log(err);
        return cb(1, null);
      }
      var locs = resp.concat(listCoords);
      pref = preference;
      typeOfPlace = type_of_place;
      console.log("type of place and pref: ", typeOfPlace, pref);
      console.log("RESP: ", locs);
      var circle = sec.getCircle(locs);
      console.log("circle is: ", circle);
      var first = {lat: locs[0].lat, lng: locs[0].lng};
      var second = {lat: locs[1].lat, lng: locs[1].lng};      
      console.log("top two locations being queried: ", first, second);
      googleMapsClient.distanceMatrix({
        origins: [first], 
        destinations: [second]
      }, function(err, response) {
        if (err) {
          console.log("error received ", err);
          return cb(2, null);
        } else {
          console.log("response from dm: ", JSON.stringify(response.json));
          var status = response.json.rows[0].elements[0].status;
          if (status == "ZERO_RESULTS") {
            return cb(2, null);
          }
          var actualDistance = response.json.rows[0].elements[0].distance.value;
          console.log("response from distanceMatrix: ", actualDistance);
          var mapDistance = Math.sqrt(Math.pow(first.lat - second.lat, 2) + Math.pow(first.lng - second.lng, 2));
          if (mapDistance > 0) {
            var maxRadius = circle.r * (actualDistance / mapDistance);  
          } else {
            var maxRadius = 2000.0;
          }
          maxRadius = (maxRadius > 2000.0)? maxRadius : 2000.0;
          console.log("max radius is: ", maxRadius, "type of place is: ", typeOfPlace);
          googleMapsClient.placesNearby({
            location: {lat: circle.x, lng: circle.y},
            radius: maxRadius,
            type: typeOfPlace
          }, function(err, response) {
            if (err) {
              console.log(err);
              return cb(3, null)
            } else {
              console.log("places nearby response: ", response.json.results);
              if(response.json.results.length == 0){
                return cb(null, null);
              }
              var results = response.json.results;
              // console.log("Results: ", results)
              var candidatePlaceIDs = [];
              var candidatePlaces = [];
              for (var i=0; i<results.length; i++) {
                candidatePlaces.push(results[i].geometry.location);
                candidatePlaceIDs.push(results[i].place_id);
              }
              console.log("candidates are: ", candidatePlaces.slice(0, 3));
              if (pref != 'rating') {
                console.log("locs are: ", locs);
                console.log("candidate places are: ", candidatePlaces);
                if (locs.length >= 6) {
                  candidatePlaces = candidatePlaces.slice(0, 14);
                }
                googleMapsClient.distanceMatrix({
                  origins: locs,
                  destinations: candidatePlaces,
                  mode: 'driving',
                  departure_time: new Date().getTime()
                }, function (err, response) {
                  if (err) {
                    console.log(err);
                    return cb(4, null);
                  } else {
                    console.log("response received for waiting time");
                    var maxDuration = {};
                    var cumDuration = {};
                    var rating = {};
                    var price_level = {};
                    var count = 0;
                    if (pref == 'waiting_time') {
                      for (var i=0; i<candidatePlaces.length; i++) {
                        console.log("i is: ", i);
                        var maxDist = 0.0;
                        for (var j=0; j<locs.length; j++) {
                          // console.log("RESPONSE.JSON: ", JSON.stringify(response.json));
                          console.log("i is: ", i, "j is: ", j);
                          console.log("NEXT: ", response.json.rows[j].elements[i]);
                          var dist = response.json.rows[j].elements[i].duration.value;
                          console.log("dist: ", dist, "locs: ", locs[j], "place: ", candidatePlaces[i]);
                          if (dist > maxDist) {
                            maxDist = dist;
                          }
                        }
                        console.log("i is: ", i, results[i].name, maxDist);
                        // maxDuration.push({key: results[i].name, value: maxDist});
                        maxDuration[results[i].name] = {dist: maxDist, loc: candidatePlaces[i], id: candidatePlaceIDs[i]};
                      }
                      var items = Object.keys(maxDuration).map(function(key) {
                        return [key, maxDuration[key]['dist'], maxDuration[key]['loc'], maxDuration[key]['id']];
                      });
                      items.sort(function(first, second) {
                        return first[1] - second[1];  
                      });
                      console.log("recommended places: ", items.slice(0, 5));
                      return cb(null, items) //return items;
                    } else if (pref == 'magic_recipe') {
                      var place_scores = {}
                      var w = {'rating': 0.2, 'time': 0.6, 'price': 0.2};
                      var maxDistanceMax = 0.0;
                      for (var i=0; i<candidatePlaces.length; i++) {
                        if ('opening_hours' in results[i]) {
                          if (results[i]['opening_hours']['open_now'] == false) {
                              continue;
                          }
                        }
                        var maxDist = 0.0;
                        for (var j=0; j<locs.length; j++) {
                          var dist = response.json.rows[j].elements[i].duration.value;
                          if (dist > maxDist) {
                            maxDist = dist;
                          }
                        }
                        console.log("i is: ", i, results[i].name, maxDist);
                        if (maxDist > maxDistanceMax) {
                          maxDistanceMax = maxDist;
                        } 
                        maxDuration[results[i].name] = {dist: maxDist, 
                                                        loc: candidatePlaces[i], id: candidatePlaceIDs[i]};
                        console.log("reached here - rating next", results[i].rating)
                        if (!('rating' in results[i]) || results[i].rating == undefined) {
                          rating[results[i].name] = {rating: 3.0, 
                                                    loc: candidatePlaces[i], id: candidatePlaceIDs[i]}; 
                        } else {
                          rating[results[i].name] = {rating: results[i].rating,
                                                    loc: candidatePlaces[i], id: candidatePlaceIDs[i]};
                        }
                        rating[results[i].name]['rating'] = (rating[results[i].name]['rating']) / 5.0;
                        console.log("price level next", results[i].price_level);
                        if (!('price_level' in results[i]) || results[i].price_level == undefined) {
                          price_level[results[i].name] = {price_level: 2.0, 
                                                    loc: candidatePlaces[i], id: candidatePlaceIDs[i]}; 
                        } else {
                          price_level[results[i].name] = {price_level: results[i].price_level,
                                                          loc: candidatePlaces[i], id: candidatePlaceIDs[i]};
                        }
                        price_level[results[i].name]['price_level'] = 
                          (4.0 - price_level[results[i].name]['price_level']) / 4.0;                                                        
                        console.log("cleared price level");
                      }
                      for (var i=0; i<candidatePlaces.length; i++) {
                        if ('opening_hours' in results[i]) {
                          if (results[i]['opening_hours']['open_now'] == false) {
                              continue;
                          }
                        }
                        maxDuration[results[i].name]['dist'] = (maxDistanceMax - maxDuration[results[i].name]['dist']) /
                          maxDistanceMax;
                        place_scores[results[i].name] = {score: w['rating'] * rating[results[i].name]['rating'] + 
                                                      w['time'] * maxDuration[results[i].name]['dist'] + 
                                                       w['price'] * price_level[results[i].name]['price_level'], 
                                                       loc: candidatePlaces[i], id: candidatePlaceIDs[i]};
                      }
                      console.log(maxDuration);
                      console.log(rating);
                      console.log(price_level);
                      console.log(place_scores);
                      var items = Object.keys(place_scores).map(function(key) {
                        return [key, place_scores[key]['score'], place_scores[key]['loc'], place_scores[key]['id']];
                      });
                      items.sort(function(first, second) {
                        return second[1] - first[1];  
                      });
                      console.log("recommended places: ", items.slice(0, 5));
                      return cb(null, items) //return items;
                    } 
                  }
                })
              } else {
                var ratings = [];
                for (var i=0; i<candidatePlaces.length; i++) {
                  ratings[results[i].name] = {rating: results[i].rating, loc: candidatePlaces[i], id: candidatePlaceIDs[i]};
                }
                var items = Object.keys(ratings).map(function (key) {
                  return [key, ratings[key]['rating'], ratings[key]['loc'], ratings['id']];
                });
                items.sort(function(first, second) {
                  return second[1] - first[1];  
                });
                console.log("recommended places: ", items.slice(0, 5));
                return cb(null, items)  //return items;
              }
            }
          })
        }
      })
    });
    
  }
}

