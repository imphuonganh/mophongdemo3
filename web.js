/*==========================================================
 Interactive Chemistry Simulation Framework
 Version : 2.0
 Author  : IMPHUONGANH
 Engine  : p5.js
==========================================================*/

"use strict";

/*==========================================================
 CONFIGURATION
==========================================================*/

const CONFIG = {

    APP_NAME: "Interactive Chemistry Simulation",

    VERSION: "2.0",

    TARGET_FPS: 60,

    BACKGROUND: "#EEF5FF",

    GRID: false,

    DEBUG: false,

    SHOW_AXES: false,

    PIXEL_DENSITY: 1,

    CANVAS_PARENT: "canvas-container",

    CAMERA: {

        zoom: 1,

        x: 0,

        y: 0

    },

    ATOM: {

        nucleusRadius: 28,

        shellGap: 34,

        glow: 14,

        labelOffset: 40

    },

    ELECTRON: {

        radius: 7,

        speed: 0.018,

        glow: 12,

        sharedSpeed: 0.008

    },

    ANIMATION: {

        approachDuration: 3000,

        overlapDuration: 2500,

        sharingDuration: 3500,

        stabilizeDuration: 2500

    }

};


/*==========================================================
 GLOBAL VARIABLES
==========================================================*/

let renderer;

let engine;

let ui;

let timeline;

let molecule;

let cameraController;

let effectEngine;


/*==========================================================
 ENUMS
==========================================================*/

const SimulationState={

    READY:"ready",

    PLAYING:"playing",

    PAUSED:"paused",

    STEP:"step",

    FINISHED:"finished"

};


const BondType={

    SINGLE:1,

    DOUBLE:2,

    TRIPLE:3

};


/*==========================================================
 UTILITY
==========================================================*/

class Utils{

    static clamp(x,min,max){

        return Math.max(min,Math.min(max,x));

    }

    static lerp(a,b,t){

        return a+(b-a)*t;

    }

    static ease(t){

        if(t<0.5){

            return 4*t*t*t;

        }

        return 1-Math.pow(-2*t+2,3)/2;

    }

    static distance(x1,y1,x2,y2){

        return Math.hypot(

            x2-x1,

            y2-y1

        );

    }

    static angle(x1,y1,x2,y2){

        return Math.atan2(

            y2-y1,

            x2-x1

        );

    }

}


/*==========================================================
 CAMERA
==========================================================*/

class CameraController{

    constructor(){

        this.zoom=1;

        this.x=0;

        this.y=0;

        this.dragging=false;

    }

    begin(){

        translate(

            width/2+this.x,

            height/2+this.y

        );

        scale(this.zoom);

    }

    end(){

    }

}


/*==========================================================
 RENDERER
==========================================================*/

class Renderer{

    constructor(){

        this.background=CONFIG.BACKGROUND;

    }

    begin(){

        background(this.background);

    }

    end(){

    }

    drawGrid(){

        stroke(220);

        strokeWeight(1);

        for(let x=-width;x<width;x+=50){

            line(x,-height,x,height);

        }

        for(let y=-height;y<height;y+=50){

            line(-width,y,width,y);

        }

    }

}


/*==========================================================
 UI MANAGER
==========================================================*/

class UIManager{

    constructor(){

        this.progressFill=document.getElementById("progressFill");

        this.progressValue=document.getElementById("progressValue");

        this.simName=document.getElementById("simName");

        this.valence=document.getElementById("valenceInfo");

        this.atomInfo=document.getElementById("atomInfo");

        this.explanation=document.getElementById("explanation");

    }

    setSimulation(name){

        this.simName.innerHTML=name;

    }

    setProgress(value){

        value=Utils.clamp(value,0,100);

        this.progressFill.style.width=value+"%";

        this.progressValue.innerHTML=Math.floor(value)+"%";

    }

    setValence(html){

        this.valence.innerHTML=html;

    }

    setAtomInfo(html){

        this.atomInfo.innerHTML=html;

    }

    setExplanation(html){

        this.explanation.innerHTML=html;

    }

}


/*==========================================================
 SIMULATION ENGINE
==========================================================*/

class SimulationEngine{

    constructor(){

        this.state=SimulationState.READY;

        this.progress=0;

        this.time=0;

        this.delta=0;

        this.speed=1;

    }

    play(){

        this.state=SimulationState.PLAYING;

    }

    pause(){

        this.state=SimulationState.PAUSED;

    }

    reset(){

        this.state=SimulationState.READY;

        this.progress=0;

        this.time=0;

    }

    step(){

        this.state=SimulationState.STEP;

    }

    update(dt){

        if(this.state!==SimulationState.PLAYING){

            return;

        }

        this.time+=dt;

    }

}


/*==========================================================
 TIMELINE
==========================================================*/

class Timeline{

    constructor(){

        this.events=[];

        this.current=0;

    }

    add(event){

        this.events.push(event);

    }

    update(){

        if(this.current>=this.events.length){

            return;

        }

        let e=this.events[this.current];

        if(e.finished){

            this.current++;

            return;

        }

        e.update();

    }

}


/*==========================================================
 EFFECT ENGINE
==========================================================*/

class EffectEngine{

    constructor(){

        this.glow=true;

        this.shadow=true;

    }

}
/*==========================================================
 ELEMENT DATABASE
==========================================================*/

const ELEMENT_DATABASE = {

    H:{
        symbol:"H",
        name:"Hydrogen",
        atomicNumber:1,
        atomicMass:1.008,
        valence:1,
        shells:[1],
        color:"#4DA3FF",
        nucleus:"#1D4ED8"
    },

    O:{
        symbol:"O",
        name:"Oxygen",
        atomicNumber:8,
        atomicMass:15.999,
        valence:6,
        shells:[2,6],
        color:"#FF5C5C",
        nucleus:"#C62828"
    },

    N:{
        symbol:"N",
        name:"Nitrogen",
        atomicNumber:7,
        atomicMass:14.007,
        valence:5,
        shells:[2,5],
        color:"#4C7DFF",
        nucleus:"#1E40AF"
    },

    C:{
        symbol:"C",
        name:"Carbon",
        atomicNumber:6,
        atomicMass:12.011,
        valence:4,
        shells:[2,4],
        color:"#555555",
        nucleus:"#222222"
    },

    Cl:{
        symbol:"Cl",
        name:"Chlorine",
        atomicNumber:17,
        atomicMass:35.45,
        valence:7,
        shells:[2,8,7],
        color:"#2ECC71",
        nucleus:"#18864A"
    }

};


/*==========================================================
 ELECTRON
==========================================================*/

class Electron{

    constructor(angle,radius,color){

        this.angle=angle;

        this.radius=radius;

        this.color=color;

        this.speed=CONFIG.ELECTRON.speed;

        this.size=CONFIG.ELECTRON.radius;

        this.shared=false;

        this.targetX=0;

        this.targetY=0;

        this.x=0;

        this.y=0;

        this.opacity=255;

    }

    update(){

        if(!this.shared){

            this.angle+=this.speed;

            this.x=Math.cos(this.angle)*this.radius;

            this.y=Math.sin(this.angle)*this.radius;

        }else{

            this.x=Utils.lerp(
                this.x,
                this.targetX,
                CONFIG.ELECTRON.sharedSpeed
            );

            this.y=Utils.lerp(
                this.y,
                this.targetY,
                CONFIG.ELECTRON.sharedSpeed
            );

        }

    }

    draw(){

        push();

        translate(this.x,this.y);

        noStroke();

        drawingContext.shadowBlur=18;
        drawingContext.shadowColor=this.color;

        fill(this.color);

        circle(0,0,this.size*2);

        fill(255);

        textAlign(CENTER,CENTER);

        textSize(11);

        text("-",0,-11);

        drawingContext.shadowBlur=0;

        pop();

    }

}


/*==========================================================
 ORBIT
==========================================================*/

class Orbit{

    constructor(radius){

        this.radius=radius;

        this.electrons=[];

    }

    addElectron(e){

        this.electrons.push(e);

    }

    update(){

        for(const e of this.electrons){

            e.update();

        }

    }

    draw(){

        noFill();

        stroke(170);

        strokeWeight(1.4);

        circle(

            0,

            0,

            this.radius*2

        );

        for(const e of this.electrons){

            e.draw();

        }

    }

}


/*==========================================================
 NUCLEUS
==========================================================*/

class Nucleus{

    constructor(element){

        this.element=element;

    }

    draw(){

        push();

        noStroke();

        drawingContext.shadowBlur=22;

        drawingContext.shadowColor=this.element.color;

        fill(this.element.nucleus);

        circle(

            0,

            0,

            CONFIG.ATOM.nucleusRadius*2

        );

        fill(255);

        textAlign(CENTER,CENTER);

        textSize(18);

        text(

            this.element.symbol,

            0,

            0

        );

        drawingContext.shadowBlur=0;

        pop();

    }

}


/*==========================================================
 ATOM
==========================================================*/

class Atom{

    constructor(symbol,x,y){

        this.data=ELEMENT_DATABASE[symbol];

        this.x=x;

        this.y=y;

        this.symbol=symbol;

        this.nucleus=new Nucleus(this.data);

        this.orbits=[];

        this.selected=false;

        this.createOrbitals();

    }

    createOrbitals(){

        let radius=48;

        for(const electronCount of this.data.shells){

            let orbit=new Orbit(radius);

            for(let i=0;i<electronCount;i++){

                orbit.addElectron(

                    new Electron(

                        TWO_PI*i/electronCount,

                        radius,

                        "#1D4ED8"

                    )

                );

            }

            this.orbits.push(orbit);

            radius+=CONFIG.ATOM.shellGap;

        }

    }

    update(){

        for(const orbit of this.orbits){

            orbit.update();

        }

    }

    draw(){

        push();

        translate(this.x,this.y);

        for(const orbit of this.orbits){

            orbit.draw();

        }

        this.nucleus.draw();

        fill(50);

        noStroke();

        textAlign(CENTER,CENTER);

        textSize(18);

        text(

            this.symbol,

            0,

            CONFIG.ATOM.labelOffset
        );

        pop();

    }

}


/*==========================================================
 BOND
==========================================================*/

class Bond{

    constructor(a,b,type=BondType.SINGLE){

        this.a=a;

        this.b=b;

        this.type=type;

        this.alpha=255;

    }

    drawSingle(){

        stroke(120);

        strokeWeight(4);

        line(

            this.a.x,

            this.a.y,

            this.b.x,

            this.b.y

        );

    }

    drawDouble(){

        stroke(120);

        strokeWeight(3);

        line(

            this.a.x,

            this.a.y-4,

            this.b.x,

            this.b.y-4

        );

        line(

            this.a.x,

            this.a.y+4,

            this.b.x,

            this.b.y+4

        );

    }

    drawTriple(){

        stroke(120);

        strokeWeight(2);

        line(

            this.a.x,

            this.a.y,

            this.b.x,

            this.b.y

        );

        line(

            this.a.x,

            this.a.y-7,

            this.b.x,

            this.b.y-7

        );

        line(

            this.a.x,

            this.a.y+7,

            this.b.x,

            this.b.y+7

        );

    }

    draw(){

        switch(this.type){

            case BondType.SINGLE:

                this.drawSingle();

                break;

            case BondType.DOUBLE:

                this.drawDouble();

                break;

            case BondType.TRIPLE:

                this.drawTriple();

                break;

        }

    }

}
/*==========================================================
 MOLECULE
==========================================================*/

class Molecule{

    constructor(name){

        this.name=name;

        this.atoms=[];

        this.bonds=[];

        this.centerX=0;

        this.centerY=0;

    }

    addAtom(atom){

        this.atoms.push(atom);

    }

    addBond(bond){

        this.bonds.push(bond);

    }

    update(){

        for(const atom of this.atoms){

            atom.update();

        }

    }

    draw(){

        for(const bond of this.bonds){

            bond.draw();

        }

        for(const atom of this.atoms){

            atom.draw();

        }

    }

}

/*==========================================================
 H2 SIMULATION
==========================================================*/

class HydrogenSimulation{

    constructor(){

        this.phase=0;

        this.timer=0;

        this.progress=0;

        this.finished=false;

        this.createScene();

    }

    createScene(){

        this.h1=new Atom("H",-240,0);

        this.h2=new Atom("H",240,0);

        this.molecule=new Molecule("H₂");

        this.molecule.addAtom(this.h1);

        this.molecule.addAtom(this.h2);

        this.bond=new Bond(

            this.h1,

            this.h2,

            BondType.SINGLE

        );

        this.bondVisible=false;

    }

    reset(){

        this.phase=0;

        this.timer=0;

        this.progress=0;

        this.finished=false;

        this.bondVisible=false;

        this.h1.x=-240;

        this.h2.x=240;

    }

    update(dt){

        if(engine.state!==SimulationState.PLAYING){

            return;

        }

        this.timer+=dt;

        switch(this.phase){

            case 0:

                this.phaseApproach(dt);

                break;

            case 1:

                this.phaseOverlap(dt);

                break;

            case 2:

                this.phaseShare(dt);

                break;

            case 3:

                this.phaseStable(dt);

                break;

        }

        this.molecule.update();

    }

    phaseApproach(dt){

        this.progress+=

        dt/

        (CONFIG.ANIMATION.approachDuration/1000);

        this.progress=

        Utils.clamp(

            this.progress,

            0,

            1

        );

        let t=

        Utils.ease(

            this.progress

        );

        this.h1.x=

        Utils.lerp(

            -240,

            -90,

            t

        );

        this.h2.x=

        Utils.lerp(

            240,

            90,

            t

        );

        ui.setProgress(

            t*25

        );

        ui.setExplanation(

        "Hai nguyên tử Hydro tiến lại gần nhau."

        );

        if(this.progress>=1){

            this.progress=0;

            this.phase=1;

        }

    }

    phaseOverlap(dt){

        this.progress+=

        dt/

        (CONFIG.ANIMATION.overlapDuration/1000);

        this.progress=

        Utils.clamp(

            this.progress,

            0,

            1

        );

        ui.setProgress(

            25+

            this.progress*25

        );

        ui.setExplanation(

        "Hai orbital 1s bắt đầu xen phủ."

        );

        if(this.progress>=1){

            this.progress=0;

            this.phase=2;

        }

    }

    phaseShare(dt){

        this.progress+=

        dt/

        (CONFIG.ANIMATION.sharingDuration/1000);

        this.progress=

        Utils.clamp(

            this.progress,

            0,

            1

        );

        this.bondVisible=true;

        ui.setProgress(

            50+

            this.progress*35

        );

        ui.setExplanation(

        "Hai electron được chia sẻ để tạo liên kết cộng hoá trị."

        );

        if(this.progress>=1){

            this.progress=0;

            this.phase=3;

        }

    }

    phaseStable(dt){

        this.progress+=

        dt/

        (CONFIG.ANIMATION.stabilizeDuration/1000);

        this.progress=

        Utils.clamp(

            this.progress,

            0,

            1

        );

        ui.setProgress(

            85+

            this.progress*15

        );

        ui.setExplanation(

        "Liên kết cộng hoá trị đã hình thành và hệ đạt trạng thái bền."

        );

        if(this.progress>=1){

            this.finished=true;

            engine.state=

            SimulationState.FINISHED;

        }

    }

    draw(){

        if(this.bondVisible){

            this.bond.draw();

        }

        this.molecule.draw();

    }

}

/*==========================================================
 SIMULATION MANAGER
==========================================================*/

class SimulationManager{

    constructor(){

        this.current=null;

    }

    loadH2(){

        this.current=

        new HydrogenSimulation();

        ui.setSimulation(

            "Hydrogen (H₂)"

        );

        ui.setValence(

        "H : 1<br>H : 1"

        );

        ui.setAtomInfo(

        "Hydrogen<br>Z = 1"

        );

    }

    update(dt){

        if(this.current){

            this.current.update(dt);

        }

    }

    draw(){

        if(this.current){

            this.current.draw();

        }

    }

}

let simulationManager;
/*==========================================================
 SHARED ELECTRON
==========================================================*/

class SharedElectronPair{

    constructor(atomA,atomB){

        this.atomA=atomA;

        this.atomB=atomB;

        this.visible=false;

        this.progress=0;

        this.oscillation=0;

    }

    update(dt){

        if(!this.visible){

            return;

        }

        this.progress=Math.min(

            this.progress+dt*0.5,

            1

        );

        this.oscillation+=dt*4;

    }

    draw(){

        if(!this.visible){

            return;

        }

        const cx=(this.atomA.x+this.atomB.x)/2;

        const cy=(this.atomA.y+this.atomB.y)/2;

        const offset=

            Math.sin(this.oscillation)*2;

        push();

        translate(cx,cy);

        drawingContext.shadowBlur=30;

        drawingContext.shadowColor="#3B82F6";

        noStroke();

        fill("#2563EB");

        circle(-8,offset,12);

        circle(8,-offset,12);

        drawingContext.shadowBlur=0;

        pop();

    }

}

/*==========================================================
 BOND EFFECT
==========================================================*/

class BondEffect{

    constructor(){

        this.alpha=0;

        this.pulse=0;

    }

    update(dt){

        this.alpha=Math.min(

            this.alpha+dt,

            1

        );

        this.pulse+=dt*5;

    }

    draw(a,b){

        const glow=

            6+

            Math.sin(this.pulse)*2;

        drawingContext.shadowBlur=glow*3;

        drawingContext.shadowColor="#60A5FA";

        stroke(59,130,246,

            this.alpha*255

        );

        strokeWeight(5);

        line(

            a.x,

            a.y,

            b.x,

            b.y

        );

        drawingContext.shadowBlur=0;

    }

}

/*==========================================================
 ORBIT GLOW
==========================================================*/

class OrbitGlow{

    static draw(radius){

        noFill();

        stroke(120,170,255,70);

        strokeWeight(2);

        circle(

            0,

            0,

            radius*2

        );

    }

}

/*==========================================================
 ATOM ANIMATION
==========================================================*/

Atom.prototype.idle=function(){

    this.y+=

    Math.sin(

        frameCount*0.02+

        this.x

    )*0.08;

};

/*==========================================================
 UPDATE ATOM
==========================================================*/

const _atomUpdate=

Atom.prototype.update;

Atom.prototype.update=function(){

    this.idle();

    _atomUpdate.call(this);

};

/*==========================================================
 SIMULATION EXTENSION
==========================================================*/

HydrogenSimulation.prototype.initializeEffects=function(){

    this.sharedPair=

        new SharedElectronPair(

            this.h1,

            this.h2

        );

    this.effect=

        new BondEffect();

};

const _createScene=

HydrogenSimulation.prototype.createScene;

HydrogenSimulation.prototype.createScene=function(){

    _createScene.call(this);

    this.initializeEffects();

};

/*==========================================================
 SHARE PHASE
==========================================================*/

const _share=

HydrogenSimulation.prototype.phaseShare;

HydrogenSimulation.prototype.phaseShare=function(dt){

    _share.call(this,dt);

    this.sharedPair.visible=true;

};

/*==========================================================
 UPDATE EXTENSION
==========================================================*/

const _update=

HydrogenSimulation.prototype.update;

HydrogenSimulation.prototype.update=function(dt){

    _update.call(this,dt);

    if(this.sharedPair){

        this.sharedPair.update(dt);

    }

    if(this.effect){

        this.effect.update(dt);

    }

};

/*==========================================================
 DRAW EXTENSION
==========================================================*/

const _draw=

HydrogenSimulation.prototype.draw;

HydrogenSimulation.prototype.draw=function(){

    if(this.effect && this.bondVisible){

        this.effect.draw(

            this.h1,

            this.h2

        );

    }

    _draw.call(this);

    if(this.sharedPair){

        this.sharedPair.draw();

    }

};

/*==========================================================
 RESET EXTENSION
==========================================================*/

const _reset=

HydrogenSimulation.prototype.reset;

HydrogenSimulation.prototype.reset=function(){

    _reset.call(this);

    this.sharedPair.visible=false;

    this.sharedPair.progress=0;

    this.effect.alpha=0;

};

/*==========================================================
 PLAYBACK CONTROLLER
==========================================================*/

class PlaybackController{

    play(){

        engine.play();

    }

    pause(){

        engine.pause();

    }

    reset(){

        engine.reset();

        simulationManager.current.reset();

        ui.setProgress(0);

    }

    step(){

        if(

            engine.state===

            SimulationState.PAUSED

        ){

            simulationManager.current.update(

                1/60

            );

        }

    }

}

const playback=

new PlaybackController();

/*==========================================================
 BUTTON EVENTS
==========================================================*/

document

.getElementById("playBtn")

.onclick=()=>{

    playback.play();

};

document

.getElementById("pauseBtn")

.onclick=()=>{

    playback.pause();

};

document

.getElementById("resetBtn")

.onclick=()=>{

    playback.reset();

};

document

.getElementById("stepBtn")

.onclick=()=>{

    playback.step();

};

document

.getElementById("fullscreenBtn")

.onclick=()=>{

    document

    .documentElement

    .requestFullscreen();

};

document

.getElementById("helpBtn")

.onclick=()=>{

    alert(

`Hydrogen H₂

1. Play để chạy mô phỏng.

2. Electron quay quanh hạt nhân.

3. Hai nguyên tử tiến lại gần.

4. Hai electron được chia sẻ.

5. Liên kết cộng hóa trị hình thành.`

    );

};
/*==========================================================
 ELECTRON TRANSITION ENGINE
==========================================================*/

class ElectronTransition{

    constructor(electron){

        this.electron=electron;

        this.active=false;

        this.progress=0;

        this.startX=0;
        this.startY=0;

        this.endX=0;
        this.endY=0;

    }

    begin(targetX,targetY){

        this.active=true;

        this.progress=0;

        this.startX=this.electron.x;
        this.startY=this.electron.y;

        this.endX=targetX;
        this.endY=targetY;

        this.electron.shared=true;

    }

    update(dt){

        if(!this.active) return;

        this.progress+=dt*0.55;

        this.progress=Math.min(this.progress,1);

        let t=Utils.ease(this.progress);

        this.electron.x=

            Utils.lerp(
                this.startX,
                this.endX,
                t
            );

        this.electron.y=

            Utils.lerp(
                this.startY,
                this.endY,
                t
            );

        if(this.progress>=1){

            this.active=false;

        }

    }

}


/*==========================================================
 COVALENT PAIR
==========================================================*/

class CovalentPair{

    constructor(atomA,atomB){

        this.atomA=atomA;
        this.atomB=atomB;

        this.angle=0;

        this.radius=10;

        this.visible=false;

    }

    update(dt){

        if(!this.visible) return;

        this.angle+=dt*2.6;

    }

    draw(){

        if(!this.visible) return;

        const cx=(this.atomA.x+this.atomB.x)/2;

        const cy=(this.atomA.y+this.atomB.y)/2;

        const x1=Math.cos(this.angle)*this.radius;

        const y1=Math.sin(this.angle)*this.radius;

        const x2=Math.cos(this.angle+PI)*this.radius;

        const y2=Math.sin(this.angle+PI)*this.radius;

        push();

        translate(cx,cy);

        drawingContext.shadowBlur=25;

        drawingContext.shadowColor="#3B82F6";

        noStroke();

        fill("#2563EB");

        circle(x1,y1,12);

        circle(x2,y2,12);

        drawingContext.shadowBlur=0;

        pop();

    }

}


/*==========================================================
 ORBIT DEFORMATION
==========================================================*/

Orbit.prototype.draw=function(){

    const scaleX=

        this.deformX || 1;

    const scaleY=

        this.deformY || 1;

    push();

    scale(scaleX,scaleY);

    noFill();

    stroke(170,190,255);

    strokeWeight(1.3);

    circle(

        0,

        0,

        this.radius*2

    );

    pop();

    for(const e of this.electrons){

        e.draw();

    }

};

Orbit.prototype.deform=function(value){

    this.deformX=

        1+value*0.18;

    this.deformY=

        1-value*0.12;

};


/*==========================================================
 BOND PULSE
==========================================================*/

Bond.prototype.draw=function(){

    const pulse=

        1+

        Math.sin(frameCount*0.08)*0.15;

    drawingContext.shadowBlur=24;

    drawingContext.shadowColor="#60A5FA";

    stroke("#4F8EF7");

    strokeWeight(5*pulse);

    line(

        this.a.x,

        this.a.y,

        this.b.x,

        this.b.y

    );

    drawingContext.shadowBlur=0;

};


/*==========================================================
 HYDROGEN EFFECTS
==========================================================*/

HydrogenSimulation.prototype.initializeAdvanced=function(){

    this.covalent=

        new CovalentPair(

            this.h1,

            this.h2

        );

    this.transitions=[];

    let e1=

        this.h1

        .orbits[0]

        .electrons[0];

    let e2=

        this.h2

        .orbits[0]

        .electrons[0];

    this.transitions.push(

        new ElectronTransition(e1)

    );

    this.transitions.push(

        new ElectronTransition(e2)

    );

};

const oldInit=

HydrogenSimulation.prototype.initializeEffects;

HydrogenSimulation.prototype.initializeEffects=function(){

    oldInit.call(this);

    this.initializeAdvanced();

};


/*==========================================================
 SHARE PHASE EXTENSION
==========================================================*/

const oldShare=

HydrogenSimulation.prototype.phaseShare;

HydrogenSimulation.prototype.phaseShare=function(dt){

    oldShare.call(this,dt);

    const cx=

        (this.h1.x+this.h2.x)/2;

    if(this.progress<0.02){

        this.transitions[0]

        .begin(

            cx-10,

            0

        );

        this.transitions[1]

        .begin(

            cx+10,

            0

        );

    }

    this.h1.orbits[0].deform(this.progress);

    this.h2.orbits[0].deform(this.progress);

};


/*==========================================================
 UPDATE EXTENSION
==========================================================*/

const oldUpdate2=

HydrogenSimulation.prototype.update;

HydrogenSimulation.prototype.update=function(dt){

    oldUpdate2.call(this,dt);

    this.covalent.update(dt);

    for(const t of this.transitions){

        t.update(dt);

    }

    if(this.phase>=2){

        this.covalent.visible=true;

    }

};


/*==========================================================
 DRAW EXTENSION
==========================================================*/

const oldDraw2=

HydrogenSimulation.prototype.draw;

HydrogenSimulation.prototype.draw=function(){

    oldDraw2.call(this);

    this.covalent.draw();

};


/*==========================================================
 PERFORMANCE
==========================================================*/

function optimizeCanvas(){

    pixelDensity(1);

    frameRate(60);

    smooth();

}

window.addEventListener(

"load",

optimizeCanvas

);
/*==========================================================
 TOOLTIP ENGINE
==========================================================*/

class Tooltip{

    constructor(){

        this.element=document.getElementById("tooltip");

    }

    show(text,x,y){

        this.element.innerHTML=text;

        this.element.style.left=(x+15)+"px";

        this.element.style.top=(y+15)+"px";

        this.element.style.opacity=1;

    }

    hide(){

        this.element.style.opacity=0;

    }

}

const tooltip=new Tooltip();

/*==========================================================
 TOOLBAR TOOLTIPS
==========================================================*/

document.querySelectorAll(".toolbar button")

.forEach(btn=>{

    btn.addEventListener("mousemove",e=>{

        tooltip.show(

            btn.innerText,

            e.clientX,

            e.clientY

        );

    });

    btn.addEventListener("mouseleave",()=>{

        tooltip.hide();

    });

});


/*==========================================================
 NOTIFICATION
==========================================================*/

class NotificationManager{

    constructor(){

        this.box=document.createElement("div");

        this.box.style.position="fixed";

        this.box.style.top="25px";

        this.box.style.right="25px";

        this.box.style.padding="14px 20px";

        this.box.style.background="rgba(255,255,255,.88)";

        this.box.style.backdropFilter="blur(12px)";

        this.box.style.borderRadius="18px";

        this.box.style.boxShadow="0 10px 30px rgba(0,0,0,.15)";

        this.box.style.opacity=0;

        this.box.style.transition=".35s";

        document.body.appendChild(this.box);

    }

    show(message){

        this.box.innerHTML=message;

        this.box.style.opacity=1;

        clearTimeout(this.timer);

        this.timer=setTimeout(()=>{

            this.box.style.opacity=0;

        },1800);

    }

}

const notify=new NotificationManager();


/*==========================================================
 PLAYBACK EXTENSION
==========================================================*/

const oldPlay=playback.play;

playback.play=function(){

    oldPlay.call(this);

    notify.show("▶ Animation Started");

}

const oldPause=playback.pause;

playback.pause=function(){

    oldPause.call(this);

    notify.show("⏸ Animation Paused");

}

const oldResetPlayback=playback.reset;

playback.reset=function(){

    oldResetPlayback.call(this);

    notify.show("⏹ Simulation Reset");

}


/*==========================================================
 TIMELINE PANEL
==========================================================*/

class TimelineLabel{

    constructor(){

        this.labels=[

            "Approach",

            "Orbital Overlap",

            "Electron Sharing",

            "Stable Bond"

        ];

    }

    update(){

        if(!simulationManager.current) return;

        let p=

        simulationManager.current.phase;

        ui.setExplanation(

            this.labels[p] ||

            "Completed"

        );

    }

}

const timelineLabel=

new TimelineLabel();


/*==========================================================
 FPS MONITOR
==========================================================*/

class FPSMonitor{

    constructor(){

        this.fps=60;

    }

    update(){

        this.fps=Math.round(frameRate());

    }

    draw(){

        if(!CONFIG.DEBUG) return;

        noStroke();

        fill(40);

        textSize(14);

        text(

            "FPS : "+this.fps,

            -width/2+20,

            -height/2+25

        );

    }

}

const fpsMonitor=

new FPSMonitor();


/*==========================================================
 KEYBOARD SHORTCUT
==========================================================*/

window.addEventListener(

"keydown",

e=>{

    switch(e.code){

        case "Space":

            if(

                engine.state===

                SimulationState.PLAYING

            ){

                playback.pause();

            }

            else{

                playback.play();

            }

            break;

        case "KeyR":

            playback.reset();

            break;

        case "KeyF":

            document.documentElement

            .requestFullscreen();

            break;

        case "ArrowRight":

            playback.step();

            break;

    }

});


/*==========================================================
 AUTO RESIZE
==========================================================*/

window.addEventListener(

"resize",

()=>{

    let p=

    document.getElementById(

        CONFIG.CANVAS_PARENT

    );

    resizeCanvas(

        p.clientWidth,

        p.clientHeight

    );

});


/*==========================================================
 DRAW EXTENSION
==========================================================*/

const previousDraw=draw;

draw=function(){

    renderer.begin();

    let dt=deltaTime/1000;

    engine.update(dt);

    push();

    cameraController.begin();

    simulationManager.update(dt);

    simulationManager.draw();

    fpsMonitor.update();

    fpsMonitor.draw();

    cameraController.end();

    pop();

    timelineLabel.update();

    renderer.end();

}


/*==========================================================
 FINAL INITIALIZATION
==========================================================*/

window.addEventListener(

"load",

()=>{

    notify.show(

        "Interactive Chemistry Simulation Ready"

    );

});
/*==========================================================
 FRAMEWORK VERSION
==========================================================*/

const FRAMEWORK={

    name:"Interactive Chemistry Simulation",

    version:"2.0",

    author:"IMPHUONGANH",

    renderer:"p5.js",

    fps:60

};


/*==========================================================
 DEBUG PANEL
==========================================================*/

class DebugPanel{

    constructor(){

        this.enabled=false;

    }

    toggle(){

        this.enabled=!this.enabled;

    }

    draw(){

        if(!this.enabled) return;

        push();

        noStroke();

        fill(255,250);

        rect(

            -width/2+10,

            -height/2+10,

            220,

            140,

            12

        );

        fill(40);

        textSize(13);

        text(

            "Framework : "+FRAMEWORK.version,

            -width/2+20,

            -height/2+35

        );

        text(

            "State : "+engine.state,

            -width/2+20,

            -height/2+55

        );

        text(

            "Progress : "+Math.floor(ui.progressValue.innerText.replace("%",""))+"%",

            -width/2+20,

            -height/2+75

        );

        text(

            "FPS : "+Math.round(frameRate()),

            -width/2+20,

            -height/2+95

        );

        pop();

    }

}

const debugPanel=new DebugPanel();


/*==========================================================
 BACKGROUND PARTICLES
==========================================================*/

class BackgroundParticle{

    constructor(){

        this.reset();

    }

    reset(){

        this.x=random(-width,width);

        this.y=random(-height,height);

        this.r=random(1,3);

        this.speed=random(.2,.7);

    }

    update(){

        this.y-=this.speed;

        if(this.y<-height){

            this.reset();

            this.y=height;

        }

    }

    draw(){

        noStroke();

        fill(150,190,255,70);

        circle(

            this.x,

            this.y,

            this.r

        );

    }

}

const particles=[];

for(let i=0;i<80;i++){

    particles.push(

        new BackgroundParticle()

    );

}


/*==========================================================
 PARTICLE RENDERER
==========================================================*/

function drawParticles(){

    push();

    for(const p of particles){

        p.update();

        p.draw();

    }

    pop();

}


/*==========================================================
 FINISH EVENT
==========================================================*/

HydrogenSimulation.prototype.finish=function(){

    notify.show(

        "✔ Covalent Bond Created"

    );

};


/*==========================================================
 FINAL DRAW EXTENSION
==========================================================*/

const oldDrawFramework=draw;

draw=function(){

    renderer.begin();

    drawParticles();

    let dt=deltaTime/1000;

    engine.update(dt);

    push();

    cameraController.begin();

    simulationManager.update(dt);

    simulationManager.draw();

    debugPanel.draw();

    cameraController.end();

    pop();

    renderer.end();

};


/*==========================================================
 SHORTCUTS
==========================================================*/

window.addEventListener(

"keydown",

e=>{

    if(e.code==="KeyD"){

        debugPanel.toggle();

    }

});


/*==========================================================
 READY
==========================================================*/

console.log(

FRAMEWORK.name+

" "+

FRAMEWORK.version+

" Ready"

);