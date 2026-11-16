const scale = [
  [50,75,100],[100,150,200],[150,225,400],[250,375,500],[500,750,1100],
  [600,1000,1400],[750,1300,1700],[1000,1700,2100],[1300,2000,2600],
  [1600,2300,3100],[1900,2900,4100],[2200,3700,4700],[2600,4200,5400],
  [2900,4900,6200],[3300,5400,7800],[3800,6100,9800],[4500,7200,11700],
  [5000,8700,14200],[5500,10700,17200],[6400,13200,22000]
];
export const presets = {
  low: {rank:0, label:'Baixa', rooms:'5–6', mobs:'1–2', traps:'0–1', loot:'1'},
  medium: {rank:1, label:'Moderada', rooms:'7–9', mobs:'2–3', traps:'1–2', loot:'1–2'},
  high: {rank:2, label:'Alta', rooms:'10–12', mobs:'3–4', traps:'2–3', loot:'2–3'}
};
export const ndTable = [
  ['0',0],['1/8',25],['1/4',50],['1/2',100],['1',200],['2',450],['3',700],['4',1100],['5',1800],
  ['6',2300],['7',2900],['8',3900],['9',5000],['10',5900],['11',7200],['12',8400],
  ['13',10000],['14',11500],['15',13000],['16',15000],['17',18000],['18',20000],['19',22000],
  ['20',25000],['21',33000],['22',41000],['23',50000],['24',62000],['25',75000],
  ['26',90000],['27',105000],['28',120000],['29',135000],['30',155000]
];

const xpByNd = new Map(ndTable);
const challenge = nd => nd.includes('/') ? nd.split('/').reduce((top,bottom) => top/Number(bottom)) : Number(nd);
const creature = (id,name,nd,hp,ac,actions,art=false) =>
  ({id,name,nd,hp,ac,xp:xpByNd.get(nd),actions,art:art ? './assets/' + id + '.webp' : null});

export const catalog = [
  creature('espada','Espada voadora animada','1/4',14,17,'Golpe cortante.',true),
  creature('armadura','Armadura animada','1',33,18,'Golpe e ataques múltiplos.',true),
  creature('azer','Sentinela azer','2',39,17,'Aura de fogo e martelo.',true),
  creature('ogro','Ogro','2',68,11,'Clava grande e azagaia.',true),
  creature('elemental-fogo','Elemental do fogo','5',93,13,'Toque abrasador. Pode atravessar espaços estreitos.',false),
  creature('gigante-fogo','Gigante do fogo','9',162,18,'Espadão e rocha incandescente.',false),
  creature('dragao-jovem','Dragão vermelho jovem','10',178,18,'Ataques múltiplos e sopro de fogo.',false),
  creature('golem-ferro','Golem de ferro','16',252,20,'Golpes, espada e hálito venenoso.',false),
  creature('dragao-adulto','Dragão vermelho adulto','17',256,19,'Ataques múltiplos, magia, sopro de fogo e ações lendárias.',false)
];

const boundaries = {
  low: {rooms:[5,6], encounters:[1,2], traps:[0,1], chests:[1,1]},
  medium: {rooms:[7,9], encounters:[2,3], traps:[1,2], chests:[1,2]},
  high: {rooms:[10,12], encounters:[3,4], traps:[2,3], chests:[2,3]}
};
const goldTiers = [[15,45],[60,180],[250,750],[1000,3000]];
const treasure = [
  ['Poção de cura','Anel de Salto'],
  ['Poção de cura maior','Anel de Proteção'],
  ['Poção de cura superior','Espada Dançarina'],
  ['Poção de cura suprema','Anel dos Três Desejos']
];
const scenes = [
  ['Galeria das Bigornas','A água bate contra os pés das bigornas enferrujadas.'],
  ['Arquivo','Mapas encharcados cobrem a mesa de um antigo escrivão.'],
  ['Passadiço','Uma passagem estreita corta o salão por cima da água.'],
  ['Câmara da Forja','As brasas pulsam sob um arco de pedra. Uma sombra se ergue atrás da bigorna.'],
  ['Cisterna','Uma fileira de pilares emerge de um espelho de água imóvel.'],
  ['Oficina','Ferramentas cobertas de fuligem repousam na bancada.'],
  ['Depósito','Caixas empilhadas ocultam parte da alvenaria.'],
  ['Retiro','Um pequeno altar repousa entre bancos de pedra.'],
  ['Corredor das Correntes','Correntes pendem do teto e tilintam com a corrente de ar.'],
  ['Poço de Têmpera','Vapor sobe de um tanque de pedra rachada.']
];
const directions = [[0,-1],[1,0],[0,1],[-1,0]];

export function trap(level = 3) {
  const tier = levelTier(level);
  const dc = [12,14,16,18][tier];
  return {
    name:'Placa solta', clue:'Uma das placas está mais limpa que as outras.',
    trigger:'Pisar na placa', detect:dc, disarm:dc,
    effect:'Um alçapão se abre. A queda causa ' + [ '1d6','2d6','4d6','6d6' ][tier] + ' de dano contundente.',
    bypass:'Usar as vigas laterais.'
  };
}

export function budget({levels,difficulty}) {
  return levels.reduce((total,level) => total + scale[level-1][presets[difficulty].rank],0);
}

export function validateParty(party) {
  return !!party && Array.isArray(party.levels) && party.levels.length >= 2 && party.levels.length <= 8 &&
    party.levels.every(level => Number.isInteger(level) && level >= 1 && level <= 20) &&
    Object.hasOwn(presets,party.difficulty) && Object.hasOwn(presets,party.size) &&
    ['auto','try','off'].includes(party.boss);
}

function randomSeed(seed) {
  let state = 2166136261;
  for (const character of seed) {
    state = Math.imul(state ^ character.charCodeAt(0),16777619) >>> 0;
  }
  state ||= 1;
  return () => {
    state ^= state << 13;
    state ^= state >>> 17;
    state ^= state << 5;
    return (state >>> 0) / 4294967296;
  };
}
const draw = (random,min,max) => min + Math.floor(random() * (max-min+1));
const choose = (random,items) => items[draw(random,0,items.length-1)];
function shuffle(random, items) {
  const copy = items.slice();
  for (let i=copy.length-1; i>0; i--) {
    const j = draw(random,0,i);
    [copy[i],copy[j]] = [copy[j],copy[i]];
  }
  return copy;
}
const levelTier = level => level < 5 ? 0 : level < 11 ? 1 : level < 17 ? 2 : 3;
const coordsKey = (x,y) => x + ',' + y;

function growMap(random,count) {
  const map = [{x:0,y:0,parent:null,depth:0}];
  const occupied = new Set(['0,0']);
  while (map.length < count) {
    const from = map.length === 4 ? [0,1] : map.map((_,index) => index);
    const candidates = from.flatMap(parent => directions.map(([dx,dy]) => ({
      x:map[parent].x+dx,y:map[parent].y+dy,parent,depth:map[parent].depth+1
    }))).filter(cell => !occupied.has(coordsKey(cell.x,cell.y)));
    const cell = choose(random,candidates);
    occupied.add(coordsKey(cell.x,cell.y));
    map.push(cell);
  }
  return map;
}

function encounter(random,party,{boss=false}={}) {
  const limit = budget(party);
  const weakest = Math.min(...party.levels);
  const count = (party.levels.length === 2 || weakest <= 2) ? party.levels.length : Math.min(8,party.levels.length*2);
  const pool = catalog.filter(mob => challenge(mob.nd) <= weakest && mob.xp > 0 && mob.xp <= limit);
  const candidates = [];
  for (const main of pool) {
    if (boss && main.xp*2 < limit) continue;
    for (let amount=1; amount<=(boss ? 1 : count); amount++) {
      const xp = amount * main.xp;
      if (xp > limit) break;
      candidates.push({main,amount,xp,extra:0});
      for (const ally of pool) {
        if (ally === main || (!boss && ally.id < main.id)) continue;
        const max = Math.min(count-amount,boss?2:count,Math.floor((limit-xp)/ally.xp));
        for (let extra=1; extra<=max; extra++) candidates.push({main,amount,ally,extra,xp:xp+extra*ally.xp});
      }
    }
  }
  if (!candidates.length) return [];
  candidates.sort((a,b) => b.xp-a.xp);
  const viable = candidates.filter(candidate => candidate.xp >= Math.max(limit*.7,candidates[0].xp*.92));
  const selected = choose(random,(viable.length ? viable : candidates.slice(0,1)).slice(0,10));
  return [
    ...Array.from({length:selected.amount}, () => ({...selected.main,boss})),
    ...Array.from({length:selected.extra}, () => ({...selected.ally}))
  ];
}

export function generateDungeon(party, seed) {
  if (!validateParty(party)) throw new Error('Confira a quantidade e os níveis dos personagens.');
  if (typeof seed !== 'string' || !seed.trim() || seed.length > 60) throw new Error('A semente precisa ter entre 1 e 60 caracteres.');
  const random = randomSeed(seed);
  const profile = boundaries[party.size];
  const levels = party.levels.slice().sort((a,b) => a-b);
  const mid = Math.floor(levels.length/2);
  const median = (levels[mid]+levels[Math.ceil(levels.length/2)-1])/2;
  const tier = levelTier(Math.floor(median));
  const map = growMap(random,draw(random,...profile.rooms));
  const routeEnd = map.reduce((previous,cell,index) => cell.depth>map[previous].depth ? index : previous,0);
  const path = new Set();
  for (let index=routeEnd; index!==null; index=map[index].parent) path.add(index);
  const sequence = shuffle(random,scenes);
  const rooms = map.map((cell,index) => {
    const [name,text] = index === 0 ? ['Entrada','Uma escada de pedra desce até o som de água corrente.'] :
      index === routeEnd ? ['Cofre da Forja','O calor termina diante de uma porta de ferro entreaberta.'] : sequence.pop();
    return {
      name,text,type:index === 0 ? 'Entrada' : index === routeEnd ? 'Objetivo' : 'Exploração',
      x:cell.x*159,y:cell.y*133,w:draw(random,95,126),h:draw(random,70,91),mobs:[],loot:[],traps:[]
    };
  });
  const sideRooms = shuffle(random,rooms.map((_,index) => index).filter(index=>!path.has(index)));
  const openRooms = shuffle(random,rooms.map((_,index) => index).filter(index=>index!==0 && index!==routeEnd));
  const attemptBoss = party.boss === 'try' || (party.boss === 'auto' && party.difficulty === 'high' && median >= 11);
  const boss = attemptBoss ? encounter(random,party,{boss:true}) : [];
  const encounterCount = draw(random,...profile.encounters);
  const encounterRooms = [...openRooms.slice(0,encounterCount-1),routeEnd];
  for (const index of encounterRooms) rooms[index].mobs = index === routeEnd && boss.length ? boss : encounter(random,party);
  const trapRooms = [...new Set([...sideRooms,...openRooms])].filter(index=>!rooms[index].mobs.length);
  const trapCount = Math.min(draw(random,...profile.traps),trapRooms.length-1);
  for (const index of trapRooms.slice(0,Math.max(0,trapCount))) rooms[index].traps=[trap(levels[0])];
  const lootSlots = [routeEnd,...Array.from(new Set([...sideRooms,...openRooms])).slice(0,draw(random,...profile.chests)-1)];
  const totalCoins = draw(random,...goldTiers[tier].map(amount=>amount*levels.length));
  const primaryCoins = lootSlots.length === 1 ? totalCoins : Math.floor(totalCoins*.6);
  const secondaryCoins = lootSlots.length === 1 ? 0 : Math.floor((totalCoins-primaryCoins)/(lootSlots.length-1));
  const remainder = totalCoins-primaryCoins-secondaryCoins*(lootSlots.length-1);
  lootSlots.forEach((index,slot) => {
    rooms[index].loot=[{
      name:slot === 0 ? 'Baú principal' : 'Baú escondido',
      gold:slot === 0 ? primaryCoins : secondaryCoins+(slot===1 ? remainder : 0),
      items:slot === 0 && (tier>0 || random()<.25) ? treasure[tier][1] : treasure[tier][0]
    }];
  });
  return {
    schema:1,seed,party:{...party,levels:party.levels.slice()},rooms,
    links:map.flatMap((cell,index)=>cell.parent===null?[]:[[cell.parent,index]]),
    selected:encounterRooms.find(index=>rooms[index].mobs.length) ?? 0,
    notices: [
      ...(attemptBoss && !boss.length ? ['Nenhum chefão do catálogo coube no orçamento.'] : []),
      ...(rooms.some(room=>room.mobs.length && room.mobs.reduce((sum,item)=>sum+item.xp,0) < budget(party)*.7)
        ? ['Alguns encontros ficaram abaixo de 70% do orçamento.'] : [])
    ]
  };
}
