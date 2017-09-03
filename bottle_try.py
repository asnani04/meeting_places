from bottle import route, run, template, Bottle, request
from find_meeting import MeetingPlaces

app = Bottle()

@app.route('/')

@app.route('/index')
def form_details():
    return '''<form action="/index" method="POST">
    Location 1: <input name="l1" type="text" />
    Location 2: <input name="l2" type="text" />
    Type of meeting place: <input name="type_of_place" type="text" />
    <input value="find places" type="submit" />
    </form>
    '''

@app.route('/index', method='POST')
def find_places():
    loc1 = request.forms.get('l1')
    loc2 = request.forms.get('l2')
    type_of_place = request.forms.get('type_of_place')

    meetingObject = MeetingPlaces()
    meetingObject.connect_to_maps()
    initial_locations = []
    initial_locations.append(loc1)
    initial_locations.append(loc2)
    sorted_max_duration = meetingObject.find_meeting_places(
        initial_locations, type_of_place)
    return '<p>' + str(sorted_max_duration[0][0]) + '</p>'
    # return '''<p> This is my day. </p>'''
    
run(app, host='localhost', port=8080, debug=True)
