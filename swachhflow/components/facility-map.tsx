'use client';
import { useEffect, useRef, useState } from 'react';
import { AlertTriangle, Check, Crosshair, Layers, LoaderCircle, MapPin, Minus, Plus, RotateCcw } from 'lucide-react';
import type { Map as GLMap, GeoJSONSource } from 'maplibre-gl';
import type { FeatureCollection } from 'geojson';
import type { Facility, Priority } from '@/lib/model';
import 'maplibre-gl/dist/maplibre-gl.css';

export type MapFacility=Facility&{priority:Priority;reason:string};
const colors={urgent:'#ce5a4f',high:'#d69b39',routine:'#278578',unknown:'#84929c'};
export default function FacilityMap({facilities,selected,onSelect,onArea,resetArea,focusId}:{facilities:MapFacility[];selected:string|null;onSelect:(id:string)=>void;onArea:(bounds:number[])=>void;resetArea:()=>void;focusId:number}){
 const container=useRef<HTMLDivElement>(null);const map=useRef<GLMap|null>(null);const handlers=useRef({onSelect,onArea});handlers.current={onSelect,onArea};
 const data=useRef(facilities);data.current=facilities;
 const [ready,setReady]=useState(false);const [failed,setFailed]=useState(false);const [moved,setMoved]=useState(false);const [locating,setLocating]=useState(false);const [message,setMessage]=useState('');
 useEffect(()=>{
  let alive=true;let resize:ResizeObserver|undefined;
  (async()=>{
   try{
    const ml=await import('maplibre-gl');
    const cfg=await fetch('/api/map-config').then(r=>r.json()).catch(()=>({})) as {styleUrl?:string;tileUrl?:string;attribution?:string};
    if(!alive||!container.current)return;
    const m=new ml.Map({container:container.current,center:[72.853,19.292],zoom:12.6,minZoom:9,maxZoom:18,attributionControl:{compact:true},style:cfg.styleUrl||{version:8,glyphs:'https://demotiles.maplibre.org/font/{fontstack}/{range}.pbf',sources:{basemap:{type:'raster',tiles:[cfg.tileUrl||'https://tile.openstreetmap.org/{z}/{x}/{y}.png'],tileSize:256,attribution:cfg.attribution||'© <a href="https://www.openstreetmap.org/copyright" target="_blank">OpenStreetMap</a> contributors'}},layers:[{id:'background',type:'background',paint:{'background-color':'#eef0e8'}},{id:'basemap',type:'raster',source:'basemap',paint:{'raster-saturation':-.8,'raster-contrast':-.14,'raster-opacity':.79}}]},refreshExpiredTiles:true});
    map.current=m;
    m.on('load',()=>{
     if(!alive)return;
     m.addSource('facilities',{type:'geojson',data:geojson(data.current),cluster:true,clusterMaxZoom:11,clusterRadius:38});
     m.addLayer({id:'clusters',type:'circle',source:'facilities',filter:['has','point_count'],paint:{'circle-color':'#267e72','circle-radius':22,'circle-stroke-color':'#fff','circle-stroke-width':4}});
     m.addLayer({id:'cluster-count',type:'symbol',source:'facilities',filter:['has','point_count'],layout:{'text-field':['get','point_count_abbreviated'],'text-size':13},paint:{'text-color':'#fff'}});
     m.addLayer({id:'marker-halo',type:'circle',source:'facilities',filter:['!', ['has','point_count']],paint:{'circle-radius':22,'circle-color':['get','color'],'circle-opacity':.12}});
     m.addLayer({id:'markers',type:'circle',source:'facilities',filter:['!', ['has','point_count']],paint:{'circle-radius':12,'circle-color':['get','color'],'circle-stroke-color':'#ffffff','circle-stroke-width':3,'circle-stroke-opacity':1}});
     m.addLayer({id:'marker-symbol',type:'symbol',source:'facilities',filter:['!', ['has','point_count']],layout:{'text-field':['get','symbol'],'text-size':13,'text-allow-overlap':true},paint:{'text-color':'#fff'}});
     m.addLayer({id:'selected',type:'circle',source:'facilities',filter:['==',['get','id'],''],paint:{'circle-radius':25,'circle-color':'transparent','circle-stroke-color':'#234c43','circle-stroke-width':2}});
     m.on('click','markers',e=>{const id=e.features?.[0]?.properties?.id;if(id)handlers.current.onSelect(id);});
     m.on('click','clusters',async e=>{const feature=e.features?.[0];if(!feature)return;const zoom=await (m.getSource('facilities') as GeoJSONSource).getClusterExpansionZoom(feature.properties?.cluster_id);m.easeTo({center:(feature.geometry as {coordinates:number[]}).coordinates as [number,number],zoom});});
     m.on('mouseenter','markers',()=>m.getCanvas().style.cursor='pointer');m.on('mouseleave','markers',()=>m.getCanvas().style.cursor='');
     setReady(true);
    });
    m.on('dragend',()=>setMoved(true));m.on('zoomend',()=>setMoved(true));
    m.on('error',e=>{if(alive){setMessage('Some map tiles could not load. Facility list remains available.');if((e.error?.message||'').includes('WebGL'))setFailed(true);}});
    resize=new ResizeObserver(()=>m.resize());resize.observe(container.current);
   }catch{if(alive)setFailed(true);}
  })();
  return()=>{alive=false;resize?.disconnect();map.current?.remove();map.current=null;};
 },[]);
 useEffect(()=>{if(ready)(map.current?.getSource('facilities') as GeoJSONSource)?.setData(geojson(facilities));},[facilities,ready]);
 useEffect(()=>{const m=map.current;if(!ready||!m)return;m.setFilter('selected',['==',['get','id'],selected||'']);if(selected){const f=facilities.find(f=>f.id===selected);if(f)m.easeTo({center:[f.lng,f.lat],duration:550});}},[selected,ready]);
 useEffect(()=>{if(focusId&&map.current){map.current.easeTo({center:[72.853,19.292],zoom:12.6});resetArea();}},[focusId]);
 const locate=()=>{if(!navigator.geolocation){setMessage('Location is not supported by your browser.');return;}setLocating(true);navigator.geolocation.getCurrentPosition(pos=>{setLocating(false);map.current?.easeTo({center:[pos.coords.longitude,pos.coords.latitude],zoom:14});setMessage('Map centred on your location. Your location is not stored.');},()=>{setLocating(false);setMessage('Location permission unavailable. You can still explore the map.');},{timeout:10000});};
 return <div className="map-shell"><div ref={container} className="map-canvas" aria-label="Interactive map of facility locations"/>
 {!ready&&!failed&&<div className="map-loading"><LoaderCircle className="spin" size={22}/><span>Preparing your city view…</span></div>}
 {failed&&<div className="map-loading"><MapPin size={28}/><strong>Map unavailable</strong><span>Use the facility list to continue.</span><button className="btn" onClick={()=>location.reload()}>Reload map</button></div>}
 <div className="map-label"><span className="live-dot"/>Mira Bhayandar <span className="map-label-small">/ Maharashtra</span></div>
 <div className="map-tools"><button aria-label="Zoom in" onClick={()=>map.current?.zoomIn()}><Plus size={18}/></button><button aria-label="Zoom out" onClick={()=>map.current?.zoomOut()}><Minus size={18}/></button><span/><button aria-label="Use my location" onClick={locate}>{locating?<LoaderCircle size={18} className="spin"/>:<Crosshair size={18}/>}</button><button aria-label="Reset map view" onClick={()=>{map.current?.easeTo({center:[72.853,19.292],zoom:12.6});resetArea();}}><RotateCcw size={17}/></button></div>
 {moved&&ready&&<button className="search-area" onClick={()=>{const b=map.current!.getBounds();onArea([b.getWest(),b.getSouth(),b.getEast(),b.getNorth()]);setMoved(false);}}>Search this area</button>}
 <div className="map-legend"><span><i className="legend-dot urgent"/><AlertTriangle size={11}/>Urgent</span><span><i className="legend-dot high"/>! Attention</span><span><i className="legend-dot routine"/><Check size={11}/>Routine</span><span><i className="legend-dot unknown"/>? Unknown</span></div>
 <div className="map-mode"><Layers size={14}/>Street map</div>
 {message&&<button className="map-message" onClick={()=>setMessage('')}>{message} ×</button>}
 </div>;
}
function geojson(facilities:MapFacility[]):FeatureCollection {return {type:'FeatureCollection',features:facilities.map(f=>({type:'Feature',geometry:{type:'Point',coordinates:[f.lng,f.lat]},properties:{id:f.id,color:colors[f.priority],symbol:({urgent:'!',high:'!',routine:'✓',unknown:'?'})[f.priority]}}))};}
