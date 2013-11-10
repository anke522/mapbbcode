/*
 * Map BBCode parser and producer. See BBCODE.md for description.
 */
window.MapBBCodeProcessor = {
    decimalDigits: 5,
    brackets: '[]',
	tagParams: false,

    _getRegExp: function() {
        var openBr = this.brackets.substring(0, 1).replace(/([\[\({])/, '\\$1'),
            closBr = this.brackets.substring(1, 2).replace(/([\]\)}])/, '\\$1');
        var reCoord = '\\s*(-?\\d+(?:\\.\\d+)?)\\s*,\\s*(-?\\d+(?:\\.\\d+)?)',
            reParams = '\\((?:([a-zA-Z0-9,]*)\\|)?(|[\\s\\S]*?[^\\\\])\\)',
            reMapElement = reCoord + '(?:' + reCoord + ')*(?:\\s*' + reParams + ')?',
            reMapOpeningTag = openBr + 'map(?:' + (this.tagParams ? '\\s+z=[\'"]([12]?\\d)[\'"](?:\\s+ll=[\'"]' + reCoord + '[\'"])?' : '=([12]?\\d)(?:,' + reCoord + ')?') + ')?' + closBr,
            reMap = reMapOpeningTag + '(' + reMapElement + '(?:\\s*;' + reMapElement + ')*)?\\s*' + openBr + '/map' + closBr,
            reMapC = new RegExp(reMap, 'i');
        return {
            coord: reCoord,
            params: reParams,
			mapElement: reMapElement,
            map: reMap,
            mapCompiled: new RegExp(reMap, 'i')
        };
    },

	// returns longest substring for determining a start of map bbcode, "[map" by default
	getOpenTagSubstring: function() {
		return this.brackets.substring(0, 1) + 'map';
	},

	// returns longest substring for determining an end of map bbcode, "[/map]" by default
	getCloseTagSubstring: function() {
		return this.brackets.substring(0, 1) + '/map' + this.brackets.substring(1, 2);
	},

    // Checks that bbcode string is a valid map bbcode
    isValid: function( bbcode ) {
        return this._getRegExp().mapCompiled.test(bbcode);
    },

    // Converts bbcode string to an array of features and metadata
    stringToObjects: function( bbcode ) {
        var regExp = this._getRegExp(),
            matches = bbcode.match(regExp.mapCompiled),
            result = { objs: [] };

        if( matches && matches[1] && matches[1].length && (+matches[1]) > 0 ) {
            result.zoom = +matches[1];
            if( matches[3] && matches[3].length > 0 ) {
                try {
                    result.pos = L && L.LatLng ? new L.LatLng(matches[2], matches[3]) : [+matches[2], +matches[3]];
                } catch(e) {}
            }
        }

        if( matches && matches[4] ) {
            var items = matches[4], itm,
				reElementC = new RegExp('^\\s*(?:;\\s*)?(' + regExp.mapElement + ')');
                reCoordC = new RegExp('^' + regExp.coord);

			itm = items.match(reElementC);
			while( itm ) {
                var s = itm[1],
                    coords = [], m, text = '', params = [];
                m = s.match(reCoordC);
                while( m ) {
                    coords.push(L && L.LatLng ? new L.LatLng(m[1], m[2]) : [+m[1], +m[2]]);
                    s = s.substring(m[0].length);
                    m = s.match(reCoordC);
                }
				if( itm[6] )
					params = itm[6].split(',');
				if( typeof itm[7] === 'string' && itm[7].length > 0 )
					text = itm[7].replace(/\\\)/g, ')').replace(/^\s+|\s+$/g, '');
                result.objs.push({ coords: coords, text: text, params: params });

				items = items.substring(itm[0].length);
				itm = items.match(reElementC);
            }
        }

        return result;
    },

    // Takes an object like stringToObjects() produces and returns map bbcode
    objectsToString: function( data ) {
        var mapData = '';
        if( data.zoom > 0 ) {
            mapData = this.tagParams ? ' z="' + data.zoom + '"' : '=' + data.zoom;
            if( data.pos )
                mapData += this.tagParams ? ' ll="' + this._latLngToString(data.pos) + '"' : ',' + this._latLngToString(data.pos);
        }

        var markers = [], paths = [], objs = data.objs || [];
        for( var i = 0; i < objs.length; i++ ) {
            var coords = objs[i].coords, str = '';
            for( var j = 0; j < coords.length; j++ ) {
                if( j > 0 )
                    str = str + ' ';
                str = str + this._latLngToString(coords[j]);
            }
            var text = objs[i].text || '', params = objs[i].params || [];
            if( text.indexOf('|') >= 0 && params.length === 0 )
                text = '|' + text;
            if( text.length > 0 || params.length > 0 )
                str = str + '(' + (params.length > 0 ? params.join(',') + '|' : '') + text.replace(/\)/g, '\\)') + ')';
            if( coords.length ) {
                if( coords.length == 1 )
                    markers.push(str);
                else
                    paths.push(str);
            }
        }

        var openBr = this.brackets.substring(0, 1),
            closBr = this.brackets.substring(1, 2);
        return markers.length || paths.length || mapData.length ? openBr + 'map' + mapData + closBr + markers.concat(paths).join('; ') + openBr + '/map' + closBr : '';
    },

    _latLngToString: function( latlng ) {
        var mult = Math.pow(10, this.decimalDigits);
        return '' + (Math.round((latlng.lat || latlng[0]) * mult) / mult) + ',' + (Math.round((latlng.lng || latlng[1]) * mult) / mult);
    }
};
