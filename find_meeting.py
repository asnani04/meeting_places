import googlemaps as maps
from datetime import datetime
import operator

class MeetingPlaces:

  def __init__(self):
    self.api_file = "../../maps-api-key.txt"
    self.gmaps = None

  def connect_to_maps(self):
    key = open(self.api_file).readlines()
    self.gmaps = maps.Client(key=key[0][:-1])

  def compute_geocode(self, place):
    return self.gmaps.geocode(place)

  def compute_sample_distances():
    distance_result = self.gmaps.distance_matrix("google india, hyderabad", "ibis hotel, hyderabad",
                                            mode="transit", departure_time=datetime.now())
    distance_result = self.gmaps.distance_matrix("indiranagar, bangalore", "church street social, bangalore",
                                            mode="driving", departure_time=datetime.now())
    # print distance_result["rows"][0]['elements'][0]['duration']


  def find_meeting_places(self, place1, place2, type_of_place):
    geocode_one = self.compute_geocode(place1)
    geocode_two = self.compute_geocode(place2)

    max_radius = self.gmaps.distance_matrix(place1, place2, mode="driving", departure_time=datetime.now())
    max_radius = max_radius['rows'][0]['elements'][0]['distance']['value']
    print max_radius
    places_result = self.gmaps.places_nearby(location=geocode_one[0]['geometry']['location'], radius=max_radius,
                                             type=type_of_place)
    dist = {}
    dist_two, dist_one, rating = {}, {}, {}
    count = 0

    results = places_result['results']
    candidate_places = []
    for result in results:
      candidate_places.append(result['geometry']['location'])
      
    distance_result = self.gmaps.distance_matrix([geocode_one[0]['geometry']['location'],
                                                  geocode_two[0]['geometry']['location']], 
                                                 candidate_places, mode="driving",
                                                 departure_time=datetime.now())

    print len(distance_result['rows']), len(distance_result['rows'][1]['elements'])
    max_duration, cum_duration, rating = {}, {}, {}
    count = 0
    for place in places_result['results']:
      max_duration[place['name']] = max(distance_result['rows'][0]['elements'][count]['duration']['value'],
                                         distance_result['rows'][1]['elements'][count]['duration']['value'])
      cum_duration[place['name']] = distance_result['rows'][0]['elements'][count]['duration']['value'] + distance_result['rows'][1]['elements'][count]['duration']['value']
      if 'rating' in place.keys():
        rating[place['name']] = place['rating']
      count += 1
    

    sorted_max_duration = sorted(max_duration.items(), key=operator.itemgetter(1))
    # print dist_one, dist_two
    print sorted_max_duration[:]
    sorted_cum_duration = sorted(cum_duration.items(), key=operator.itemgetter(1))
    sorted_rating = list(reversed(sorted(rating.items(), key=operator.itemgetter(1))))
    print sorted_cum_duration
    print rating
    # sorted_rating = list(reversed(sorted(rating.items(), key=operator.itemgetter(1))))
    # print sorted_rating[:]
  

meetingObject = MeetingPlaces()
meetingObject.connect_to_maps()
meetingObject.find_meeting_places('ibis hotel, hyderabad', 'google india, hyderabad', 'cafe')
