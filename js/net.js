// Online-Duell über öffentliche MQTT-Broker (Relay, kein eigener Server nötig).
// Spielstand liegt "retained" am Broker → Fernpartie Zug um Zug, auch wenn einer offline war.
// Beide Broker gleichzeitig: Senden an alle, Empfangen von allen (fällt einer aus, läuft es über den anderen).
var Net = (function () {
  var BROKERS = ['wss://broker.emqx.io:8084/mqtt', 'wss://broker.hivemq.com:8884/mqtt'];
  var clients = [], room = null, onState = null, onPeer = null, myId = null, lastState = null, statusCb = null;
  function id() { var q = location.search.match(/[?&]cid=(\w+)/); if (q) return q[1]; /* ?cid= nur zum Testen mit zwei Tabs */ try { var v = localStorage.getItem('shogiPfad.cid'); if (!v) { v = Math.random().toString(36).slice(2, 10); localStorage.setItem('shogiPfad.cid', v); } return v; } catch (e) { return Math.random().toString(36).slice(2, 10); } }
  myId = id();
  function topic(t) { return 'shogipfad/v1/' + room + '/' + t; }
  function code() { var a = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789', s = ''; for (var i = 0; i < 6; i++) s += a[Math.floor(Math.random() * a.length)]; return s; }
  function anyUp() { return clients.some(function (c) { return c.connected; }); }
  function status() { if (statusCb) statusCb(anyUp() ? 'online' : 'verbinde'); }
  function seats(s) { return s.seats ? (s.seats[0] ? 1 : 0) + (s.seats[1] ? 1 : 0) : 0; }
  function len(s) { return s && s.moves ? s.moves.length : -1; }
  // neuerer Stand: höhere Revanche-Nummer, sonst mehr Züge
  // bei gleich vielen, aber anderen Zügen entscheidet der spätere Zeitstempel (auf allen Geräten gleich)
  // u = angenommene Zugrücknahmen (kürzere Zugliste gewinnt dann), ev = Anfrage/Antwort zur Rücknahme bei gleicher Zugliste
  function newer(a, b) { if (!b) return true; if ((a.reset || 0) !== (b.reset || 0)) return (a.reset || 0) > (b.reset || 0); if ((a.u || 0) !== (b.u || 0)) return (a.u || 0) > (b.u || 0); if (len(a) !== len(b)) return len(a) > len(b); if ((a.ev || 0) !== (b.ev || 0)) return (a.ev || 0) > (b.ev || 0); if (seats(a) !== seats(b)) return seats(a) > seats(b); return (a.t || 0) > (b.t || 0) && JSON.stringify(a.moves) !== JSON.stringify(b.moves); }
  function connect(r, cbState, cbPeer, cbStatus) {
    leave(); room = r; onState = cbState; onPeer = cbPeer; statusCb = cbStatus;
    if (typeof mqtt === 'undefined') { if (statusCb) statusCb('offline'); return; }
    if (statusCb) statusCb('verbinde');
    BROKERS.forEach(function (url) {
      var c = mqtt.connect(url, { clientId: 'sp_' + myId + '_' + Math.random().toString(36).slice(2, 6), clean: true, connectTimeout: 8000, reconnectPeriod: 2000, keepalive: 20 });
      clients.push(c);
      c.on('connect', function () {
        status();
        c.subscribe([topic('state'), topic('ping')], { qos: 1 });
        c.publish(topic('ping'), JSON.stringify({ id: myId, t: Date.now(), hello: true }));
        // Broker ohne gespeicherten Stand (oder nach Ausfall leer): unseren nachreichen
        c._got = false; setTimeout(function () { if (!c._got && lastState) send(c, lastState); }, 2500);
      });
      c.on('message', function (t, msg) {
        var d; try { d = JSON.parse(msg.toString()); } catch (e) { return; }
        if (t === topic('state')) {
          c._got = true;
          if (newer(d, lastState)) lastState = d;
          else if (newer(lastState, d)) send(c, lastState); // dieser Broker hat einen älteren Stand → nachziehen
          onState && onState(d); // App gleicht per Zugliste ab (gleiche Stände sind dort ein No-op)
        }
        if (t === topic('ping') && d.id !== myId) { onPeer && onPeer(d); if (d.hello) c.publish(topic('ping'), JSON.stringify({ id: myId, t: Date.now() })); }
      });
      c.on('close', status); c.on('offline', status);
    });
  }
  function send(c, st) { if (c.connected) c.publish(topic('state'), JSON.stringify(st), { retain: true, qos: 1 }); }
  function publishState(st) { lastState = st; clients.forEach(function (c) { send(c, st); }); }
  // Retained-Stand neu holen (z. B. Handy war gesperrt): neu abonnieren liefert ihn sofort
  function resync() {
    clients.forEach(function (c) {
      if (!c.connected) { try { c.reconnect(); } catch (e) { } return; }
      c.unsubscribe(topic('state'), function () { c.subscribe(topic('state'), { qos: 1 }); });
    });
  }
  document.addEventListener('visibilitychange', function () { if (!document.hidden && room) resync(); });
  addEventListener('online', function () { if (room) resync(); });
  function leave() { clients.forEach(function (c) { try { c.end(true); } catch (e) { } }); clients = []; room = null; lastState = null; }
  function ping() { clients.forEach(function (c) { if (c.connected) c.publish(topic('ping'), JSON.stringify({ id: myId, t: Date.now() })); }); }
  return { connect: connect, publishState: publishState, leave: leave, code: code, ping: ping, resync: resync, me: function () { return myId; }, last: function () { return lastState; }, setLast: function (s) { lastState = s; }, _clients: function () { return clients; } }; // _clients nur für Tests (Netzabbruch simulieren)
})();
