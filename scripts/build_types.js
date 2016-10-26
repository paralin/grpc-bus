function processEnum(types, enm) {
  if (enm.name && enm.values && enm.values.length > 0) {
    var typ = types[enm.name] = {isEnum: true};
    for (var i = 0; i < enm.values.length; i++) {
      var valo = enm.values[i];
      typ[valo.name] = valo.id;
    }
  }
}

function processMessage(types, msg) {
  if (msg.name && msg.fields && msg.fields.length > 0) {
    var typ = types[msg.name] = {};
    for (var i = 0; i < msg.fields.length; i++) {
      var f = msg.fields[i];
      typ[f.name] = f;
    }
  }

  if (msg.messages != null) {
    for (var i = 0; i < msg.messages.length; i++) {
      processMessage(types, msg.messages[i]);
    }
  }

  if (msg.enums != null) {
    for (var i = 0; i < msg.enums.length; i++) {
      processEnum(types, msg.enums[i]);
    }
  }
}

if (!module.parent) {
  (function() {
    var data = "";
    var types = {};
    process.stdin.resume();
    process.stdin.on('data', function(buf) { data += buf.toString(); });
    process.stdin.on('end', function() {
      processMessage(types, JSON.parse(data));
      console.log(types);
    });
  })();
}

module.exports = {
  processEnum: processEnum,
  processMessage: processMessage,
};
