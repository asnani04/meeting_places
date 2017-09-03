from bottle import route, run, template, Bottle, request
from find_meeting import MeetingPlaces

app = Bottle()

@app.route('/')

@app.route('/index')
def form_details():
    return '''
    <style>
    body {
        background-color: #F0E68C;
        background-image: url("https://www.landmarkbangkok.com/images/dining/Huntsman-3.jpg");
    }
    #locations {
    	text-align: center;
    	padding: 2px;
    	border-radius: 4px;
    	background-color: lightgrey;
    	margin-top: 150px;	
    	margin-left: 400px;
    	margin-right: 400px;
    	border-style: ridge;
    	border-width: 4px;
    	border-color: lightgrey;
	}
	ul {
    	list-style-type: none;
    	margin: 0;
    	padding: 0;
    	overflow: hidden;
    	background-color: #333;
    	position: fixed;
    	top: 0;
    	left: 0;
    	width: 100%;
	}

	li {	
    	float: left;
	}

	li a {
    	display: block;
    	color: white;
    	text-align: center;
    	padding: 14px 16px;
    	text-decoration: none;
	}

	li a:hover:not(.active) {
    	background-color: #111;
	}

	.active {
	    background-color: #4CAF50;
	}
    </style>

    <ul>
  		<li><a href="#home">Home</a></li>
  		<li><a class="active" href="#letsmeet">Let's Meet</a></li>
  		<li><a href="#contact">Contact</a></li>
  		<li><a href="#about">About</a></li>
  		<li style="float:right"><a class="active" href="#logout">Logout</a></li>
	</ul>

    <form action="/index" id="locations" method="POST">
    <br>
    Location 1: <input name="l1" type="text" /> <br> <br>
    Location 2: <input name="l2" type="text" /> <br> <br>
    Location 3: <input name="l3" type="text" /> <br> <br>
    <div id="fields">
    <button type="button" onclick="add_field()">Add more locations</button>
    </div>
    <br>Type of meeting place: <input name="type_of_place" type="text" /> <br> <br>
    Filter results on the basis of <select name="criteria">
    	<option value="travel_time">Travel Time</option>
    	<option value="waiting_time">Waiting Time</option>
    	<option value="rating">Rating</option>
  	</select> <br> <br>
    <input value="Find Places" type="submit" /> <br><br>
    </form>
    
    <script>
    function add_field() {
    	var dummy = 'Location 4: <input name="l4" type="text" /> <br> <br> <button type="button" onclick="add_field()">Add more locations</button>';
		document.getElementById("fields").innerHTML = dummy;
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
    string_req = '''
    <style>
    body {
        background-color: #F0E68C;
        background-image: url("https://www.landmarkbangkok.com/images/dining/Huntsman-3.jpg");
    }    
    ul#navigation {
    	list-style-type: none;
    	margin: 0;
    	padding: 0;
    	overflow: hidden;
    	background-color: #333;
    	position: fixed;
    	top: 0;
    	left: 0;
    	width: 100%;
	}

	.locations {
		font-size: 20px;
    	text-align: center;
    	padding: 5px;
    	border-radius: 4px;
    	background-color: lightgrey;
    	margin-top: 1px;	
    	margin-left: 2px;
    	margin-right: 2px;
    	margin-bottom: 0px;
    	border-style: ridge;
    	border-width: 4px;
    	border-color: lightgrey;
	}

	.locations:hover {
    	background-color: yellow;
    }

	li {	
    	float: left;
	}

	li a {
    	display: block;
    	color: white;
    	text-align: center;
    	padding: 14px 16px;
    	text-decoration: none;
	}

	li a:hover:not(.active) {
    	background-color: #111;
	}

	.active {
	    background-color: #4CAF50;
	}
    </style>

    <ul id="navigation">
  		<li><a href="#home">Home</a></li>
  		<li><a href="#letsmeet">Let's Meet</a></li>
  		<li><a class="active" href="#results">Results</a></li>
  		<li><a href="#contact">Contact</a></li>
  		<li><a href="#about">About</a></li>
  		<li style="float:right"><a class="active" href="#logout">Logout</a></li>
	</ul><br><br><br>
    '''
    for j in range(len(sorted_list)):
    	string_req = string_req + '<div class="locations">' + str(sorted_list[j][0]) + '</div>'
    return string_req
    # return '''<p> This is my day. </p>'''
    
run(app, host='localhost', port=8080, debug=True)
