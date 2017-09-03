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
    initial_locations = []
    for i in range(2):
        initial_locations.append(request.forms.get('l' + str(i+1)))
    type_of_place = request.forms.get('type_of_place')

    meetingObject = MeetingPlaces()
    meetingObject.connect_to_maps()
    sorted_max_duration = meetingObject.find_meeting_places(
        initial_locations, type_of_place)
    return '<p>' + str(sorted_max_duration[0][0]) + '</p>'
    # return '''<p> This is my day. </p>'''
    
run(app, host='localhost', port=8080, debug=True)
