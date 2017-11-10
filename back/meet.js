var async = require('async');
var googleMapsClient = require('@google/maps').createClient({
  key: 'AIzaSyBeWcVkl8kxqTdbvNjQfAtvJ0SlfBeXSEQ'
});

var sec = require('./smallest_enclosing_circle.js');
var typeOfPlace = 'restaurant';
var pref = 'travel_time';

function createuser(listLoc, callback){
  googleMapsClient.geocode({
    address: listLoc
  }, function(err, response) {
    console.log("Inside func")
    // console.log(err, response)
    if(err){
      return callback(err, null);
    }
    // console.log(response.json.results);
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
      next(err, resp);
    })
  }, function(err, locs){
    if(err){
      console.log(err)
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
    getLocations(listLocs, function(err, resp){
      if(err){
        console.log(err);
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
          console.log(err);
        } else {
          var actualDistance = response.json.rows[0].elements[0].distance.value;
          console.log("response from distanceMatrix: ", actualDistance);
          var mapDistance = Math.sqrt(Math.pow(first.lat - second.lat, 2) + Math.pow(first.lng - second.lng, 2));
          var maxRadius = circle.r * (actualDistance / mapDistance);
          console.log("max radius is: ", maxRadius, "type of place is: ", typeOfPlace);
          googleMapsClient.placesNearby({
            location: {lat: circle.x, lng: circle.y},
            radius: maxRadius,
            type: typeOfPlace
          }, function(err, response) {
            if (err) {
              console.log(err);
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
                googleMapsClient.distanceMatrix({
                  origins: locs,
                  destinations: candidatePlaces,
                  mode: 'driving',
                  departure_time: new Date().getTime()
                }, function (err, response) {
                  if (err) {
                    console.log(err);
                  } else {
                    console.log("response received for waiting time");
                    var maxDuration = {};
                    var cumDuration = {};
                    var rating = {};
                    var count = 0;
                    if (pref == 'waiting_time') {
                      // console.log("waiting time computations", locs);
                      // console.log("length of result and loc: ", results.length, locs.length)
                      // for (var i=0; i<2; i++) {
                      //   for (var j=0; j<2; j++) {
                      //      console.log("nested example: ", i, j); 
                      //   }
                      // }
                      for (var i=0; i<results.length; i++) {
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
                    } else if (pref == 'travel_time') {
                      for (var i=0; i<results.length; i++) {
                        console.log("i is: ", i);
                        var sumDist = 0.0;
                        for (var j=0; j<locs.length; j++) {
                          // console.log("RESPONSE.JSON: ", JSON.stringify(response.json));
                          console.log("i is: ", i, "j is: ", j);
                          console.log("NEXT: ", response.json.rows[j].elements[i]);
                          var dist = response.json.rows[j].elements[i].duration.value;
                          console.log("dist: ", dist, "locs: ", locs[j], "place: ", candidatePlaces[i]);
                          sumDist = sumDist + dist;
                        }
                        console.log("i is: ", i, results[i].name, maxDist);
                        // maxDuration.push({key: results[i].name, value: maxDist});
                        cumDuration[results[i].name] = {dist: sumDist, loc: candidatePlaces[i], id: candidatePlaceIDs[i]};
                      }
                      var items = Object.keys(cumDuration).map(function(key) {
                        return [key, cumDuration[key]['dist'], cumDuration[key]['loc'], cumDuration[key]['id']];
                      });
                      items.sort(function(first, second) {
                        return first[1] - second[1];  
                      });
                      console.log("recommended places: ", items.slice(0, 5));
                      return cb(null, items)  //return items;
                    } 
                  }
                })
              } else {
                var ratings = [];
                for (var i=0; i<results.length; i++) {
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

