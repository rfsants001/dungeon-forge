import {READY,PRESENT,validArt,drawPublicMap} from './projection.js';

const $ = id => document.getElementById(id);
const parentWindow = window.opener;
const origin = window.location.origin;

function present(scene) {
  $('wait-screen').hidden=!!scene;
  $('creature-screen').hidden=scene?.kind!=='creature';
  $('room-screen').hidden=scene?.kind!=='room';
  document.querySelector('main').setAttribute('aria-labelledby',
    scene?.kind==='creature'?'creature-title':scene?.kind==='room'?'scene-title':'player-title');
  const image=$('creature-art');
  if (scene?.kind==='creature') {
    $('creature-title').textContent=scene.title;
    image.hidden=!validArt(scene.art);
    if (!image.hidden) {
      image.alt='Ilustração de '+scene.title;
      image.src=scene.art;
    } else image.removeAttribute('src');
  } else image.removeAttribute('src');
  if (scene?.kind==='room') {
    $('scene-title').textContent=scene.title;
    $('scene-text').textContent=scene.text;
    drawPublicMap($('scene-map'),scene.rooms,scene.links);
  } else $('scene-map').replaceChildren();
}
if (parentWindow) {
  window.addEventListener('message',event=>{
    if (event.source===parentWindow && event.origin===origin && event.data?.type===PRESENT) {
      present(event.data.scene);
    }
  });
  parentWindow.postMessage({type:READY},origin);
}
