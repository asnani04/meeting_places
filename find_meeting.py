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

    for places in places_result['results']:
      # print places.keys()
      if 'rating' in places.keys():
        rating[places['name']] = places['rating']

      dist_place1 = self.gmaps.distance_matrix(geocode_one[0]['geometry']['location'],
                                          places['geometry']['location'],
                                          mode="driving", departure_time=datetime.now())
      duration = dist_place1["rows"][0]['elements'][0]
      if duration['status'] == 'OK':
        dist[places['name']] = duration['duration']['value']
        dist_one[places['name']] = duration['duration']['value']

      dist_place2 = self.gmaps.distance_matrix(geocode_two[0]['geometry']['location'], places['name'] + ", hyderabad",
                                          mode="driving", departure_time=datetime.now())
      duration = dist_place2["rows"][0]['elements'][0]
      if duration['status'] == 'OK':
        if places['name'] in dist.keys():
          count += 1
        dist[places['name']] += duration['duration']['value']
        dist_two[places['name']] = duration['duration']['value']

      # print count
      # print rating

    sorted_dist = sorted(dist.items(), key=operator.itemgetter(1))
    # print dist_one, dist_two
    print sorted_dist[:]
    sorted_rating = list(reversed(sorted(rating.items(), key=operator.itemgetter(1))))
    print sorted_rating[:]


meetingObject = MeetingPlaces()
meetingObject.connect_to_maps()
meetingObject.find_meeting_places('ibis hotel, hyderabad', 'google india, hyderabad', 'cafe')
