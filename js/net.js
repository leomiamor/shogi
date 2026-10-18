// Online-Duell über öffentlichen MQTT-Broker (Relay, kein eigener Server nötig).
// Spielstand liegt "retained" am Broker → Fernpartie Zug um Zug, auch wenn einer offline war.
var Net = (function () {
  var BROKERS = ['wss://broker.emqx.io:8084/mqtt', 'wss://broker.hivemq.com:8884/mqtt'];
  var client = null, room = null, onState = null, onPeer = null, myId = null, lastState = null, bi = 0, statusCb = null;
  function id() { try { var v = localStorage.getItem('shogiPfad.cid'); if (!v) { v = Math.random().toString(36).slice(2, 10); localStorage.setItem('shogiPfad.cid', v); } return v; } catch (e) { return Math.random().toString(36).slice(2, 10); } }
  myId = id();
  function topic(t) { return 'shogipfad/v1/' + room + '/' + t; }
  function code() { var a = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789', s = ''; for (var i = 0; i < 6; i++) s += a[Math.floor(Math.random() * a.length)]; return s; }
  function status(s) { if (statusCb) statusCb(s); }
  function connect(r, cbState, cbPeer, cbStatus) {
    leave(); room = r; onState = cbState; onPeer = cbPeer; statusCb = cbStatus;
    if (typeof mqtt === 'undefined') { status('offline'); return; }
    status('verbinde');
    client = mqtt.connect(BROKERS[bi % BROKERS.length], { clientId: 'sp_' + myId + '_' + Math.random().toString(36).slice(2, 6), clean: true, connectTimeout: 8000, reconnectPeriod: 3000, keepalive: 30 });
    var failed = 0;
    client.on('connect', function () {
      status('online');
      client.subscribe([topic('state'), topic('ping')]);
      client.publish(topic('ping'), JSON.stringify({ id: myId, t: Date.now(), hello: true }));
      if (lastState) setTimeout(function () { if (lastState) publishState(lastState, true); }, 1500);
    });
    client.on('message', function (t, msg) {
      var d; try { d = JSON.parse(msg.toString()); } catch (e) { return; }
      if (t === topic('state')) { if (!lastState || (d.moves || []).length >= (lastState.moves || []).length || d.reset > (lastState.reset || 0)) { lastState = d; onState && onState(d); } else publishState(lastState, true); }
      if (t === topic('ping') && d.id !== myId) { onPeer && onPeer(d); if (d.hello) client.publish(topic('ping'), JSON.stringify({ id: myId, t: Date.now() })); }
    });
    client.on('error', function () { failed++; });
    client.on('offline', function () { status('verbinde'); if (++failed > 2 && client) { bi++; var rr = room, a = onState, b = onPeer, c = statusCb; connect(rr, a, b, c); } });
  }
  function publishState(st, quiet) {
    lastState = st;
    if (client && client.connected) client.publish(topic('state'), JSON.stringify(st), { retain: true, qos: 1 });
  }
  function leave() { if (client) { try { client.end(true); } catch (e) { } } client = null; room = null; lastState = null; }
  function ping() { if (client && client.connected) client.publish(topic('ping'), JSON.stringify({ id: myId, t: Date.now() })); }
  return { connect: connect, publishState: publishState, leave: leave, code: code, ping: ping, me: function () { return myId; }, setLast: function (s) { lastState = s; } };
})();
