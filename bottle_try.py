from bottle import route, run, template, Bottle, request
from find_meeting import MeetingPlaces

app = Bottle()

@app.route('/')

@app.route('/index')
def form_details():
    return '''
    <style>
    body {
                background-color: #99ff99;
    }
    #locations {
    	text-align: center;
    	padding: 2px;
    	border-radius: 4px;
    	background-color: lightgrey;
    	margin-left: 400px;
    	margin-right: 400px;
    	border-style: ridge;
    	border-width: 4px;
    	border-color: lightgrey;
	}
    </style>
    <form action="/index" id="locations" method="POST">
    <br>
    Location 1: <input name="l1" type="text" /> <br> <br>
    Location 2: <input name="l2" type="text" /> <br> <br>
    Location 3: <input name="l3" type="text" /> <br> <br>
    <div id="wrapper">
    <button type="button" onclick="add_field()">Add more locations</button>
    </div>
    <br>Type of meeting place: <input name="type_of_place" type="text" /> <br> <br>
    Filter results on the basis of <select name="criteria">
    	<option value="travel_time">Travel Time</option>
    	<option value="waiting_time">Waiting Time</option>
    	<option value="rating">Rating</option>
  	</select> <br> <br>
    <input value="Find Places" type="submit" /> <br>
    </form>
    <script>
    function add_field() {
    	var dummy = '<span>Label: <input type="text"><small>(ft)</small></span>\r\n';
		document.getElementById('wrapper').innerHTML += dummy;
    }
    </script>
    '''

@app.route('/index', method='POST')
def find_places():
    initial_locations = []
    for i in range(3):
        initial_locations.append(request.forms.get('l' + str(i+1)))
    type_of_place = request.forms.get('type_of_place')
    pref = request.forms.get('criteria')

    meetingObject = MeetingPlaces()
    meetingObject.connect_to_maps()

    sorted_list = meetingObject.find_meeting_places(
        initial_locations, type_of_place, pref)
    string_req = ""
    for j in range(len(sorted_list)):
    	string_req = string_req + '<p>' + str(sorted_list[j][0]) + '</p><br>'
    return string_req
    # return '''<p> This is my day. </p>'''
    
run(app, host='localhost', port=8080, debug=True)
