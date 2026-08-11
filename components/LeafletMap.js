import { forwardRef, useImperativeHandle, useRef, useEffect, useCallback, useMemo } from 'react';
import { StyleSheet } from 'react-native';
import { WebView } from 'react-native-webview';
import { LEAFLET_JS, LEAFLET_CSS } from '../assets/leafletBundle';

function regionToZoom(region) {
  return Math.max(1, Math.min(18, Math.round(Math.log2(360 / region.latitudeDelta))));
}

function buildHtml(isDark, lat, lng, zoom, interactive) {
  const tileUrl = isDark
    ? 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png'
    : 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png';

  // En modo preview (tarjetas) el mapa es sólo una imagen: sin gestos, para que
  // el scroll de la lista y el tap de la tarjeta no se los coma el mapa
  const mapOpts = interactive
    ? ''
    : ',dragging:false,touchZoom:false,doubleClickZoom:false,scrollWheelZoom:false,boxZoom:false,keyboard:false,tap:false';

  return `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8"/>
<meta name="viewport" content="width=device-width,initial-scale=1,maximum-scale=1,user-scalable=no"/>
<style>${LEAFLET_CSS}
*{margin:0;padding:0;box-sizing:border-box}
html,body,#map{width:100%;height:100%;overflow:hidden}
</style>
</head>
<body>
<div id="map"></div>
<script>${LEAFLET_JS}</script>
<script>
var map=L.map('map',{zoomControl:false,attributionControl:false${mapOpts}});
L.tileLayer('${tileUrl}',{maxZoom:19}).addTo(map);
map.setView([${lat},${lng}],${zoom});

var markersMap={};
var polylineLayer=null;
var userLayer=null;

function postRN(obj){
  try{window.ReactNativeWebView.postMessage(JSON.stringify(obj));}catch(e){}
}

function pinIcon(color){
  return L.divIcon({
    html:'<div style="width:18px;height:18px;border-radius:50%;background:'+(color||'#E8611A')+';border:2.5px solid #fff;box-shadow:0 2px 5px rgba(0,0,0,.35)"></div>',
    className:'',iconSize:[18,18],iconAnchor:[9,9],popupAnchor:[0,-12]
  });
}

function numberedIcon(n){
  return L.divIcon({
    html:'<div style="width:32px;height:32px;border-radius:50%;background:#E8611A;border:2px solid #fff;display:flex;align-items:center;justify-content:center;color:#fff;font-size:13px;font-weight:700;box-shadow:0 2px 4px rgba(0,0,0,.3)">'+n+'</div>',
    className:'',iconSize:[32,32],iconAnchor:[16,16],popupAnchor:[0,-18]
  });
}

function handleMessage(e){
  var d;
  try{d=JSON.parse(e.data);}catch(err){return;}
  if(d.type==='animateToRegion'){
    var z=Math.max(1,Math.min(18,Math.round(Math.log2(360/d.region.latitudeDelta))));
    map.setView([d.region.latitude,d.region.longitude],z,{animate:true,duration:0.5});
  } else if(d.type==='fitToCoordinates'){
    if(d.coords&&d.coords.length>0){
      var bounds=d.coords.map(function(c){return[c.latitude,c.longitude];});
      map.fitBounds(bounds,{padding:d.padding||[80,50],animate:d.animate!==false});
    }
  } else if(d.type==='setMarkers'){
    Object.values(markersMap).forEach(function(m){m.remove();});
    markersMap={};
    (d.markers||[]).forEach(function(m){
      if(m.lat==null||m.lng==null)return;
      var icon=m.label!=null?numberedIcon(m.label):pinIcon(m.color);
      var mk=L.marker([m.lat,m.lng],{icon:icon}).addTo(map);
      if(m.title)mk.bindPopup('<b>'+m.title+'</b>'+(m.description?'<br/>'+m.description:''));
      mk.on('click',function(){postRN({type:'markerPress',id:m.id});});
      markersMap[m.id]=mk;
    });
  } else if(d.type==='setPolyline'){
    if(polylineLayer){polylineLayer.remove();polylineLayer=null;}
    if(d.coords&&d.coords.length>1){
      polylineLayer=L.polyline(d.coords.map(function(c){return[c.latitude,c.longitude];}),{color:'#E8611A',weight:4}).addTo(map);
    }
  } else if(d.type==='setUserLocation'){
    if(userLayer){userLayer.remove();}
    userLayer=L.circleMarker([d.lat,d.lng],{radius:8,fillColor:'#4285F4',fillOpacity:1,color:'#fff',weight:2.5}).addTo(map);
  } else if(d.type==='invalidateSize'){
    map.invalidateSize({animate:false});
  }
}

document.addEventListener('message',handleMessage);
window.addEventListener('message',handleMessage);
map.whenReady(function(){postRN({type:'ready'});});
</script>
</body>
</html>`;
}

const LeafletMap = forwardRef(function LeafletMap(
  {
    style, initialRegion, markers = [], routeMarkers = [], polylineCoords = [],
    userLocation, isDark, onMarkerPress, interactive = true,
  },
  ref,
) {
  const webRef = useRef(null);
  const isReady = useRef(false);
  const queue = useRef([]);

  // Always-current prop refs for use inside stable callbacks
  const markersRef = useRef(markers);
  const routeMarkersRef = useRef(routeMarkers);
  const polylineCoordsRef = useRef(polylineCoords);
  const userLocationPropRef = useRef(userLocation);
  const syncTimerRef = useRef(null);

  markersRef.current = markers;
  routeMarkersRef.current = routeMarkers;
  polylineCoordsRef.current = polylineCoords;
  userLocationPropRef.current = userLocation;

  const send = useCallback((msg) => {
    const js = `handleMessage({data:${JSON.stringify(JSON.stringify(msg))}});true;`;
    if (isReady.current) {
      webRef.current?.injectJavaScript(js);
    } else {
      queue.current.push(js);
    }
  }, []);

  // Re-send all current state to WebView (used to recover from lost messages)
  const syncAll = useCallback(() => {
    const allMarkers = [
      ...markersRef.current
        .filter((m) => m.lat != null && m.lng != null)
        .map((m) => ({ id: String(m.id), lat: m.lat, lng: m.lng, title: m.name, description: m.address, color: '#E8611A' })),
      ...routeMarkersRef.current
        .filter((m) => m.lat != null && m.lng != null)
        .map((m, i) => ({ id: `r${m.id ?? i}_${i}`, lat: m.lat, lng: m.lng, title: `${i + 1}. ${m.name}`, label: i + 1 })),
    ];
    send({ type: 'setMarkers', markers: allMarkers });
    send({ type: 'setPolyline', coords: polylineCoordsRef.current });
    if (userLocationPropRef.current) {
      send({ type: 'setUserLocation', lat: userLocationPropRef.current.latitude, lng: userLocationPropRef.current.longitude });
    }
  }, [send]);

  useImperativeHandle(ref, () => ({
    animateToRegion: (region) => send({ type: 'animateToRegion', region }),
    fitToCoordinates: (coords, options) =>
      send({ type: 'fitToCoordinates', coords, padding: options?.padding, animate: options?.animate }),
    invalidateSize: () => {
      send({ type: 'invalidateSize' });
      // After focus, re-sync all state with a short delay so that any
      // route-related useEffects in the parent have had time to run
      if (syncTimerRef.current) clearTimeout(syncTimerRef.current);
      syncTimerRef.current = setTimeout(() => {
        syncTimerRef.current = null;
        syncAll();
      }, 400);
    },
  }), [send, syncAll]);

  // Cleanup pending sync timer on unmount
  useEffect(() => () => { if (syncTimerRef.current) clearTimeout(syncTimerRef.current); }, []);

  useEffect(() => {
    const all = [
      ...markers
        .filter((m) => m.lat != null && m.lng != null)
        .map((m) => ({ id: String(m.id), lat: m.lat, lng: m.lng, title: m.name, description: m.address, color: '#E8611A' })),
      ...routeMarkers
        .filter((m) => m.lat != null && m.lng != null)
        .map((m, i) => ({ id: `r${m.id ?? i}_${i}`, lat: m.lat, lng: m.lng, title: `${i + 1}. ${m.name}`, label: i + 1 })),
    ];
    send({ type: 'setMarkers', markers: all });
  }, [markers, routeMarkers, send]);

  useEffect(() => {
    send({ type: 'setPolyline', coords: polylineCoords });
  }, [polylineCoords, send]);

  useEffect(() => {
    if (userLocation) {
      send({ type: 'setUserLocation', lat: userLocation.latitude, lng: userLocation.longitude });
    }
  }, [userLocation, send]);

  const onMarkerPressRef = useRef(onMarkerPress);
  onMarkerPressRef.current = onMarkerPress;

  const handleWebMessage = useCallback((e) => {
    try {
      const data = JSON.parse(e.nativeEvent.data);
      if (data.type === 'ready') {
        isReady.current = true;
        queue.current.forEach((js) => webRef.current?.injectJavaScript(js));
        queue.current = [];
      } else if (data.type === 'markerPress') {
        onMarkerPressRef.current?.(data.id);
      }
    } catch {}
  }, []);

  const html = useMemo(
    () => buildHtml(isDark, initialRegion.latitude, initialRegion.longitude, regionToZoom(initialRegion), interactive),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [],
  );

  return (
    <WebView
      ref={webRef}
      style={[StyleSheet.absoluteFill, style]}
      source={{ html }}
      originWhitelist={['*']}
      javaScriptEnabled
      domStorageEnabled
      onMessage={handleWebMessage}
      scrollEnabled={interactive}
      // Sin interacción los toques deben llegar a la tarjeta que hay debajo
      pointerEvents={interactive ? 'auto' : 'none'}
    />
  );
});

export default LeafletMap;
