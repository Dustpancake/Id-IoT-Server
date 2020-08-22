/* MAGIC VALUES */
var CONTINUATION_BIT = 128,
      MIN_LENGTH_BYTE = 1,
      MAX_LENGTH_BYTE = 5;

var client_id_str = "-";


function getClientID(data, s) {
    /*
        returns the client id string    
    */
    var CONNECT_SKIP_LENGTH = 10; // 10 bytes is CONNECT specific header
    var UTF8_OFFSET = 2;

    var skip_bytes = bytesToHeader(data) + CONNECT_SKIP_LENGTH;
    var cid_length = (data.charCodeAt(skip_bytes) << 8) | (data.charCodeAt(skip_bytes + 1));  // combine MSB and LSB to find total length
    client_id_str = data.slice(skip_bytes + UTF8_OFFSET, skip_bytes + UTF8_OFFSET + cid_length);
}

function bytesToHeader(data) {
    /*
        returns number of bytes to skip until after the last possible length byte
    */
    var num = 1;
    while ((data.charCodeAt(num) & CONTINUATION_BIT) && (num < MAX_LENGTH_BYTE)) {    // until no continuation bit set
        num++;
    }   
    return num + 1; // + 1 makes it after last byte
}

function getType(data) {
    /*
        returns int in [1, 16] representing the MQTT message type
    */
    var DATA_MASK = 240;
    var BIT_SHIFT = 4;

    return ((data.charCodeAt(0) & DATA_MASK) >> BIT_SHIFT);   // AND 1111 0000 and then SHIFT to 0000 1111
}

function getMessageLength(data) {
    /*
        returns the remainder length of the message as calculated by the header length bytes
    */
    var DATA_MASK = 127;

    var sum = 0;
    for (var i = MIN_LENGTH_BYTE; i < MAX_LENGTH_BYTE; i++) {
        var byte = data.charCodeAt(i);
        sum += (byte & DATA_MASK) * Math.pow(CONTINUATION_BIT, (i-1));

        i += CONTINUATION_BIT - (byte & CONTINUATION_BIT);  // branchless version of "if (byte & CONTINUATION_BIT) { break; }"
    }
    return sum;
}

function handleMQTTMessage(s) {
    s.on('upload', (data, flags) => {
        if ( data.length == 0 ) {
            return;
        } else {
            switch (getType(data)) {
                case 1:
                    getClientID(data, s); 
                    break;
                // case 2:
                default:
                    break;
            }
            s.allow();
        }
    });

}

function setClientId(s) {
    return client_id_str;
}
