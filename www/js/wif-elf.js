var wif_file = '';
var parsed_wif = '';
var position = 1;
var direct_picks = '';
var pick_count = '';
var filename = ''

// make it easier to use local storage with objects
Storage.prototype.setObject = function(key, value) {
    this.setItem(key, JSON.stringify(value));
}
Storage.prototype.getObject = function(key) {
    var value = this.getItem(key);
    return value && JSON.parse(value);
}

function parse_ini_string(data){
    var regex = {
        section: /^\s*\[\s*([^\]]*)\s*\]\s*$/,
        param: /^\s*([\w\.\-\_]+)\s*=\s*(.*?)\s*$/,
        comment: /^\s*;.*$/
    };
    var value = {};
    var lines = data.split(/\r\n|\r|\n/);
    var section = null;
    value['meta'] = {};
    lines.forEach(function(line){
        if(regex.comment.test(line)){
            // metadata
            t_line = line.substring(1);
            if (regex.param.test(t_line)) {
              var match = t_line.match(regex.param);
              var key_i = match[1].toLowerCase();
              value['meta'][key_i] = match[2];
            }
        }else if(regex.param.test(line)){
            var match = line.match(regex.param);
            var key_i = match[1].toLowerCase();
            if(section){
                value[section][key_i] = match[2];
            }else{
                value[key_i] = match[2];
            }
        }else if(regex.section.test(line)){
            var match = line.match(regex.section);
            var section_i = match[1].toLowerCase();
            value[section_i] = {};
            section = section_i;
        }else if(line.length == 0 && section){
            section = null;
        };
    });
    return value;
}

function supports_html5_storage() {
  try {
    return 'localStorage' in window && window['localStorage'] !== null;
  } catch (e) {
    return false;
  }
}

function supports_html5_file_api() {
  if (window.File && window.FileReader && window.FileList && window.Blob) {
    return true;
  } else {
    return false;
  }
}

function resume_wif() {
  if (localStorage.getObject('wif')) {
    parsed_wif = localStorage.getObject('wif');
    position = localStorage.getObject('position');
    direct_picks = localStorage.getObject('direct_picks');
    pick_count = localStorage.getObject('pick_count');
    filename = localStorage.getObject('filename');
    display_wif(parsed_wif);
  }
}

function load_wif(wif, name) {
  // parse picks into a useful format
  var shafts = wif['weaving']['shafts'];
  direct_picks = {};
  $.each(wif['treadling'], function(key, value) {
    pick = wif['tieup'][value].split(',');
    // set up empty pick
    var parsed_pick = [];
    for(i=1;i<=shafts;i++) {
      parsed_pick[i] = false;
    }
    // fill in shaft info
    $.each(pick, function(key, value) {
      parsed_pick[value] = true;
    });
    direct_picks[key] = parsed_pick;
  });

  // how many different picks (treadlings) do we have anyway?
  pick_count = Object.keys(wif['treadling']).length;

  // filename
  filename = name;

  // save wif stuff in local storage
  localStorage.setObject('wif', wif);
  localStorage.setObject('position', 1);
  localStorage.setObject('direct_picks', direct_picks);
  localStorage.setObject('pick_count', pick_count);
  localStorage.setObject('filename', filename);

  // show new wif
  display_wif(wif);
}

function display_wif(wif) {
  // initial fill of treadling from current position
  var shafts = parsed_wif['weaving']['shafts'];

  // make it fill the screen
  view_height = document.documentElement.clientHeight;
  view_width = document.documentElement.clientWidth;
  $('#content').css('height', view_height + 'px');
  $('#pick-nav').css('width', (view_width / (parseInt(shafts) + 1)) + 'px');
  $('#pick-nav').css('font-size', (100 / (parseInt(shafts) + 2) / 2) + 'vw');

  // add info about current wif
  $('#current-wif').html(filename);

  // create tds for direct tieup
  $.each(['pick1', 'pick2', 'pick3', 'pick4', 'pick5'], function(key, value) {
    var tds = '<td id="' + value + '-id" class="pick-id"></td>';
    for(i=shafts;i>0;i--) {
      tds += '<td id="' + value + '-shaft' + i  + '">' + i + '</td>';
    }
    $('#' + value).html(tds);
  });

  display_pick(position);
}

function display_pick(n) {
  var shafts = parsed_wif['weaving']['shafts'];

  $.each(['pick1', 'pick2', 'pick3', 'pick4', 'pick5'], function(key, value) {
    offset = key - 2;
    pick_number = get_pick_number(n, offset);
    var pick = direct_picks[pick_number];
    $('#' + value + '-id').html(pick_number);
    for(i=shafts;i>0;i--) {
      if (pick[i] == true) {
        $('#' + value + '-shaft' + i).addClass('raised');
      } else {
        $('#' + value + '-shaft' + i).removeClass('raised');
      }
    }
  });
}

function get_pick_number(pick_index, offset) {
  if (pick_index > pick_count) {
    offset = offset + (pick_index - pick_count);
    pick_index = pick_count;
  } else if (pick_index < 1) {
    offset = offset + pick_index - 1
    pick_index = 1
  }
  num = pick_index + offset;
  if (num < 1) {
    return pick_count + 1 + offset;
  } else if (num > pick_count) {
    return num - pick_count;
  } else {
    return num;
  }
}

function next_pick() {
  next_pick = get_pick_number(position, 1);
  display_pick(next_pick);
  position = next_pick;
  localStorage.setObject('position', next_pick);
}

function previous_pick() {
  previous_pick = get_pick_number(position, -1);
  display_pick(previous_pick);
  position = previous_pick;
  localStorage.setObject('position', previous_pick);
}

function debug_wif(wif) {
  output = '';
  $.each(wif['treadling'], function(key, value) {
    output += key + ': ' + wif['tieup'][value] + '<br>';
  });
  $('#debug').html(output);
}

$(document).ready(function() {
  // resume wif if we have one saved
  resume_wif();

  // attach button handlers
  $('#pick-prev').click(previous_pick);
  $('#pick-next').click(next_pick);

  $('#file').change(function() {
    var reader = new FileReader();
    reader.onload = function(e) {
      wif_file = e.target.result;
      parsed_wif = parse_ini_string(wif_file);
      load_wif(parsed_wif, $('#file')[0].files[0].name);
    };
    reader.readAsText($('#file')[0].files[0]);
  });
});
