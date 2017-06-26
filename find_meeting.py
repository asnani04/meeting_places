import googlemaps as maps
from datetime import datetime
import operator
from math import sqrt
import smallest_enclosing_circle as sec

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


  def find_meeting_places(self, init_loc, type_of_place):
    geocode_one = self.compute_geocode(init_loc[0])
    geocode_two = self.compute_geocode(init_loc[1])

    geocodes = []
    x_mean = 0.0
    y_mean = 0.0
    for loc in init_loc:
      x = self.compute_geocode(loc)[0]['geometry']['location']['lat']
      y = self.compute_geocode(loc)[0]['geometry']['location']['lng']
      geocodes.append([x, y])
      
    circle = sec.make_circle(geocodes)
    centre = [circle[0], circle[1]]
    max_radius = circle[2]
    
    actual_distance = self.gmaps.distance_matrix(init_loc[0], init_loc[1], mode="driving", departure_time=datetime.now())
    actual_distance = actual_distance['rows'][0]['elements'][0]['distance']['value']
    print actual_distance
    map_distance = sqrt((
      geocode_one[0]['geometry']['location']['lat'] - geocode_two[0]['geometry']['location']['lat'])**2 +
                        (geocode_one[0]['geometry']['location']['lng'] - geocode_two[0]['geometry']['location']['lng'])**2)
    max_radius = max_radius * (actual_distance / map_distance)

    places_result = self.gmaps.places_nearby(location=centre, radius=max_radius, type=type_of_place)
    dist = {}
    dist_two, dist_one, rating = {}, {}, {}
    count = 0

    results = places_result['results']
    candidate_places = []
    for result in results:
      candidate_places.append(result['geometry']['location'])
      
    distance_result = self.gmaps.distance_matrix(geocodes, 
                                                 candidate_places, mode="driving",
                                                 departure_time=datetime.now())

    print len(distance_result['rows']), len(distance_result['rows'][1]['elements'])
    max_duration, cum_duration, rating = {}, {}, {}
    count = 0
    for place in places_result['results']:
      max_duration[place['name']] = max([distance_result['rows'][i]['elements'][count]['duration']['value'] for i in range(len(init_loc))])
      cum_duration[place['name']] = sum([distance_result['rows'][i]['elements'][count]['duration']['value'] for i in range(len(init_loc))])
      if 'rating' in place.keys():
        rating[place['name']] = place['rating']
      count += 1
    

    sorted_max_duration = sorted(max_duration.items(), key=operator.itemgetter(1))

    print sorted_max_duration[:]
    sorted_cum_duration = sorted(cum_duration.items(), key=operator.itemgetter(1))
    sorted_rating = list(reversed(sorted(rating.items(), key=operator.itemgetter(1))))
    print sorted_cum_duration
    print sorted_rating
  

meetingObject = MeetingPlaces()
meetingObject.connect_to_maps()
initial_locations = ['ibis hotel, hyderabad', 'google india, hyderabad', 'inorbit mall, hyderabad']
meetingObject.find_meeting_places(initial_locations, 'spa')
