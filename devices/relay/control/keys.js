// Relay key grammar (docs/design-language.md, devices/relay/SPEC.md).
// - Random 1, Random 2 and Bypass act on release.
// - Shift is a held modifier. A key pressed while Shift is held, or held when Shift goes down, forms a combination:
//   on release it does its Shift function (Random 1 = Save, Random 2 = Load) instead of its own action.
// - Shift + Bypass opens the menu as Bypass goes down (the one press action); its release then does nothing.
// - In the menu and in Save / Load: Bypass = enter / confirm, Shift = back / cancel, both on release.
//   Random 1 and Random 2 do nothing there.
// - A key used in a combination never also does its own action, Shift included.
export function createRelayKeys(h){
  const K={r1:{down:false,combo:false},r2:{down:false,combo:false},byp:{down:false,combo:false}};
  let sh=false,shUsed=false;
  const down=w=>{
    if(w==='sh'){if(sh)return;sh=true;shUsed=false;for(const k of Object.values(K))if(k.down){k.combo=true;shUsed=true;}return;}
    const k=K[w];if(k.down)return;k.down=true;k.combo=sh;if(sh)shUsed=true;
    if(w==='byp'&&sh&&!h.inMenu())h.openMenu();
  };
  const up=w=>{
    if(w==='sh'){if(!sh)return;sh=false;const used=shUsed;shUsed=false;if(!used&&h.inMenu())h.back();return;}
    const k=K[w];if(!k.down)return;k.down=false;const combo=k.combo;k.combo=false;
    if(h.inMenu()){if(!combo&&w==='byp')h.enter();return;}
    if(combo){if(w==='r1')h.save();else if(w==='r2')h.load();return;}
    if(w==='byp')h.toggleBypass();else h.random(w==='r1'?0:1);
  };
  /* forget every held key (window lost focus): nothing fires */
  const clear=()=>{sh=false;shUsed=false;for(const k of Object.values(K)){k.down=false;k.combo=false;}};
  return{down,up,clear,isDown:w=>w==='sh'?sh:K[w].down};
}
