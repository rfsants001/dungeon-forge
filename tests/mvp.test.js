import assert from 'node:assert/strict';
import {test} from 'node:test';
import {budget,generateDungeon} from '../public/rules.js';
import {creatureScene,roomScene,validArt} from '../public/projection.js';

const party = {levels:[3,3,3,3],difficulty:'medium',size:'medium',boss:'auto'};

test('orçamentos do SRD para grupos de nível comum e misto',()=>{
  assert.equal(budget(party),900);
  assert.equal(budget({...party,levels:[4,4,5,5]}),2250);
  assert.throws(()=>generateDungeon({...party,levels:[0,3]},'forja'),/níveis/);
});

test('mesma semente recria o mesmo mapa; semente diferente cria outro',()=>{
  assert.deepEqual(generateDungeon(party,'forja'),generateDungeon(party,'forja'));
  assert.notDeepEqual(generateDungeon(party,'forja').rooms,generateDungeon(party,'cisterna').rooms);
});

test('o gerador respeita tamanho, alcance, distribuição, ouro e XP',()=>{
  const profiles={
    low:{rooms:[5,6],encounters:[1,2],traps:[0,1],chests:[1,1]},
    medium:{rooms:[7,9],encounters:[2,3],traps:[1,2],chests:[1,2]},
    high:{rooms:[10,12],encounters:[3,4],traps:[2,3],chests:[2,3]}
  };
  const between = (value,[low,high])=>assert.ok(value>=low && value<=high,value+' fora de '+low+'–'+high);
  for (const size of Object.keys(profiles)) {
    for (const level of [1,3,8,11,17,20]) {
      for (const count of [2,4,8]) {
        const settings={...party,size,difficulty:size,levels:Array(count).fill(level)};
        const profile=profiles[size];
        for (let seed=1; seed<=8; seed++) {
          const {rooms,links}=generateDungeon(settings,String(seed));
          assert.equal(links.length,rooms.length-1);
          assert.equal(new Set(rooms.map(room=>room.x+','+room.y)).size,rooms.length);
          const reachable=new Set([0]);
          for (const [parent,child] of links) {
            assert.ok(reachable.has(parent));
            const [a,b]=[rooms[parent],rooms[child]];
            assert.ok(a.x===b.x || a.y===b.y);
            reachable.add(child);
          }
          assert.equal(reachable.size,rooms.length);
          assert.ok(rooms[0].mobs.length+rooms[0].traps.length===0);
          assert.ok(rooms.slice(1).some(room=>room.mobs.length+room.traps.length===0));
          between(rooms.length,profile.rooms);
          between(rooms.filter(room=>room.mobs.length).length,profile.encounters);
          between(rooms.flatMap(room=>room.traps).length,profile.traps);
          between(rooms.flatMap(room=>room.loot).length,profile.chests);
          const [min,max]=level<5?[15,45]:level<11?[60,180]:level<17?[250,750]:[1000,3000];
          between(rooms.flatMap(room=>room.loot).reduce((total,chest)=>total+chest.gold,0),[count*min,count*max]);
          for (const room of rooms) {
            assert.ok(room.mobs.reduce((total,mob)=>total+mob.xp,0)<=budget(settings));
            assert.ok(room.mobs.length<=(count===2 || level<=2?count:Math.min(8,2*count)));
            assert.ok(!room.mobs.length || !room.traps.length);
          }
        }
      }
    }
  }
});

test('chefão usa uma fração do orçamento e só aparece no objetivo',()=>{
  const settings={...party,levels:[11,11],difficulty:'high',size:'high',boss:'auto'};
  const dungeon=generateDungeon(settings,'chefao');
  const bossRoom=dungeon.rooms.find(room=>room.mobs.some(mob=>mob.boss));
  assert.equal(bossRoom?.type,'Objetivo');
  assert.ok(bossRoom.mobs.find(mob=>mob.boss).xp>=budget(settings)/2);
  assert.ok(generateDungeon({...settings,boss:'off'},'chefao').rooms.every(room=>room.mobs.every(mob=>!mob.boss)));
});

test('projeção de criatura contém só imagem e nome público',()=>{
  const image='./assets/ogro.webp';
  const dto=creatureScene({name:'Ogro',publicName:'Criatura desconhecida',art:image,hp:68,ac:11,nd:2,xp:450,actions:'Privado'});
  assert.deepEqual(dto,{kind:'creature',title:'Criatura desconhecida',art:image});
  assert.equal(validArt('https://example.com/ogro.png'),false);
  assert.equal(validArt('data:image/svg+xml;base64,abc'),false);
  assert.equal(creatureScene({name:'Ogro',art:null}).art,null);
});

test('projeção de sala omite conteúdo privado e conexões com salas ocultas',()=>{
  const dungeon=generateDungeon(party,'sala');
  const next=dungeon.links.find(([parent])=>parent===0)[1];
  const dto=roomScene(dungeon,new Set([0,next]),next);
  assert.deepEqual(dto.rooms.map(({id})=>id),[0,next]);
  assert.deepEqual(dto.links,[[0,next]]);
  assert.ok(dto.rooms.every(item=>!('mobs' in item) && !('traps' in item) && !('loot' in item)));
  assert.equal(dto.text,dungeon.rooms[next].text);
});
