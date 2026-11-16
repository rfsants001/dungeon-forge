export const READY = 'dungeon-forge:player-ready';
export const PRESENT = 'dungeon-forge:present';

export function fitMap(rooms) {
  const minX = Math.min(...rooms.map(room=>room.x-room.w/2))-32;
  const maxX = Math.max(...rooms.map(room=>room.x+room.w/2))+32;
  const minY = Math.min(...rooms.map(room=>room.y-room.h/2))-32;
  const maxY = Math.max(...rooms.map(room=>room.y+room.h/2))+32;
  return [minX,minY,maxX-minX,maxY-minY];
}

export function validArt(value) {
  return typeof value === 'string' && (/^\.\/assets\/(?:armadura|azer|ogro|espada)\.webp$/.test(value) ||
    (value.length <= 1_049_000 && /^data:image\/(?:png|jpeg|webp);base64,[a-z0-9+/]+={0,2}$/i.test(value)));
}

export function creatureScene(creature) {
  return {kind:'creature',title:creature.publicName || creature.name,art:validArt(creature.art)?creature.art:null};
}

export function roomScene({rooms,links}, revealed, current) {
  const content = rooms[current];
  return {
    kind:'room',
    title:content.name,
    text:content.text,
    rooms:rooms.flatMap(({name,x,y,w,h},id)=>revealed.has(id)?[{id,name,x,y,w,h}]:[]),
    links:links.filter(([left,right])=>revealed.has(left)&&revealed.has(right))
  };
}

const svgNs = 'http://www.w3.org/2000/svg';

function element(tag, attrs) {
  const node = document.createElementNS(svgNs,tag);
  for (const [key,value] of Object.entries(attrs)) node.setAttribute(key,value);
  return node;
}

export function drawPublicMap(svg, rooms, links) {
  const lookup = new Map(rooms.map(room=>[room.id,room]));
  svg.setAttribute('viewBox',fitMap(rooms).join(' '));
  svg.setAttribute('aria-label','Salas reveladas: '+rooms.map(room=>room.name).join(', '));
  const corridors = links.flatMap(([a,b]) => {
    const left=lookup.get(a), right=lookup.get(b);
    if (!left || !right) return [];
    return ['corridor-border','corridor-fill'].map(style=>
      element('path',{class:style,d:'M '+left.x+' '+left.y+' L '+right.x+' '+right.y}));
  });
  const marks = rooms.map(({id,x,y,w,h,name}) => {
    const group=element('g',{});
    const title=element('title',{});
    title.textContent=name;
    const rect=element('rect',{class:'room-wall',x:x-w/2,y:y-h/2,width:w,height:h,rx:3});
    const label=element('text',{class:'map-label',x,y:y+7,'text-anchor':'middle'});
    label.textContent=String(id+1).padStart(2,'0');
    group.append(title,rect,label);
    return group;
  });
  svg.replaceChildren(...corridors,...marks);
}
