import {
  Scene,
  PerspectiveCamera,
  Vector3,
  WebGLRenderer,
  PCFSoftShadowMap,
  AmbientLight,
  SpotLight,
  BoxGeometry,
  MeshPhongMaterial,
  Mesh,
  Math as Math3,
  Vector2,
  Geometry,
  FontLoader,
  Font,
  MeshBasicMaterial,
  Color,
  TextGeometry,
  Cache,
  Group,
  CylinderGeometry,
  DoubleSide,
  MultiplyBlending,
  BackSide,
  PlaneGeometry
} from "three";
import _ from "lodash";
import OrbitControls from "three-orbitcontrols";
import { MeshLine, MeshLineMaterial } from "three.meshline";
import { TweenMax, Elastic } from "gsap";
import {
  CSS3DRenderer,
  CSS3DObject
} from "../node_modules/three/examples/jsm/renderers/CSS3DRenderer.js";
import "./style.scss";
import data, { colors } from "./data";

// Cache for the fonts
Cache.enabled = true;

const gridColor = 0x000000;

let scene: Scene;
let sceneCss: Scene;
let renderer: WebGLRenderer;
let rendererCss;
let camera: PerspectiveCamera;
let font: Font;
let fontBold: Font;
let cameraDirection: Vector3;
let yLabelsGroup: Group;
let scaleInitiated = false;

const graphSize = 100;
const cameraDistance = 200;
const paddingLabel = 5;
const gridLineSize = 0.2;
const axisLineWidth = 0.6;
const glossaireScale = 0.3;

function init() {
  parseDataForLimits();
  initListeners();
  init3DScene();
}

let maxY: number;
let uCount: number;
let uCountLabel: string[] = [];
let nCount: number;
let nCountLabel: string[] = [];
let upperBound: number;
let tickSpacing: number;
let scale = "s";

function parseDataForLimits() {
  uCount = _.size(data);
  _.each(data, (ns, userCount) => {
    uCountLabel.push(userCount);
    if (!nCount) {
      nCount = _.size(ns);
    }
    _.each(ns, (details, nCount) => {
      nCountLabel.push(nCount);
      const max = _.chain(details)
        .flatMap()
        .sum()
        .value();

      if (!maxY || max > maxY) {
        maxY = max;
      }
    });
  });

  const ns = new niceScale(0, maxY, 10);
  ns.calculate();

  upperBound = ns.getNiceUpperBound();
  tickSpacing = ns.getTickSpacing();
}

function initListeners() {
  // Update aspect ratio on windows resize event
  window.addEventListener("resize", function() {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
    rendererCss.setSize(window.innerWidth, window.innerHeight);
  });
}

function init3DScene() {
  // Setup Scene / Camera
  scene = new Scene();
  sceneCss = new Scene();
  camera = new PerspectiveCamera(
    35,
    window.innerWidth / window.innerHeight,
    0.1,
    5000
  );

  cameraDirection = new Vector3(0, 0, 0);
  const cameraPosition = new Vector3(
    cameraDistance + 90,
    cameraDistance,
    cameraDistance
  );

  camera.position.set(cameraPosition.x, cameraPosition.y, cameraPosition.z);

  const controls = new OrbitControls(camera);
  controls.enableDamping = false;
  controls.dampingFactor = 0.6;

  camera.lookAt(cameraDirection.clone());

  // Setup Renderer
  renderer = new WebGLRenderer({
    antialias: true,
    alpha: true
  });

  //CSS3D Renderer
  rendererCss = new CSS3DRenderer();
  rendererCss.setSize(window.innerWidth, window.innerHeight);
  rendererCss.domElement.style.position = "absolute";
  rendererCss.domElement.style.top = "0";

  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = PCFSoftShadowMap;

  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.setPixelRatio(window.devicePixelRatio);
  rendererCss.render(sceneCss, camera);
  renderer.render(scene, camera);

  renderer.domElement.style.position = "absolute";
  renderer.domElement.style.top = "0";
  // make sure original renderer appears on top of CSS renderer
  renderer.domElement.style.zIndex = "1";

  document.getElementById("webGL-container").append(renderer.domElement);

  document.body.appendChild(rendererCss.domElement);

  init3DElements();
}

function init3DElements() {
  createGrid();
  createLabelsAndLines();
  createBars();
  createLight();
  createGlossaire();
}

///////////////////////
// Create Elements   //
///////////////////////

// @ts-ignore
window.resetScale = s => {
  scale = s;

  if (!scaleInitiated) {
    scaleInitiated = true;
  } else {
    scene.remove(scene.getObjectByName("yLabelsGroup"));
  }

  yLabelsGroup = new Group();
  yLabelsGroup.name = "yLabelsGroup";

  createYAxisLabelAndLines(yLabelsGroup);
  yLabelsGroup.translateOnAxis(new Vector3(1, 0, 0), graphSize);
  scene.add(yLabelsGroup);
};

function createGlossaire() {
  const keys = Object.keys(data[uCountLabel[0]][nCountLabel[0]]);

  const element = document.createElement("div");
  const list = keys
    .map(
      key =>
        `<li><span style="background: #${new Color(
          colors[key]
        ).getHexString()}"></span> ${key}</li>`
    )
    .join("");
  element.innerHTML = `
    <div id="glossaire" style="transform: scale(${glossaireScale});">
      <ul>
        ${list}
      </ul>
      <div id="scale">
        <input type="radio" class="radio" name="scale" value="s" checked onclick="resetScale('s');"> <span>Seconds</span><br>
        <input type="radio" class="radio" name="scale" value="ms" onclick="resetScale('ms');"> <span>Milliseconds</span>
      </div>
    </div>
  `.trim();

  const cssObject = new CSS3DObject(element);

  let width: number;
  let height: number;
  measureHTMLElement(element, (el: HTMLDivElement) => {});
  measureHTMLElement(element, (el: HTMLDivElement) => {
    width = el.offsetWidth;
    height = el.offsetHeight;

    console.log(el.scrollHeight);
    console.log(el.offsetHeight);
    console.log(el.clientHeight);

    console.log(el.scrollWidth);
    console.log(el.offsetWidth);
    console.log(el.clientWidth);

    console.log("widthxheight", width, height);
  });

  cssObject.position.z = graphSize - (width * glossaireScale) / 2;
  cssObject.position.y = graphSize - (height * glossaireScale) / 2;
  cssObject.position.x = 0.1;
  cssObject.rotation.y = Math3.degToRad(90);

  sceneCss.add(cssObject);

  // Black backside to hide the magic happening with the element created next
  let material = new MeshBasicMaterial({ color: 0x000000, side: BackSide });
  let geometry = new PlaneGeometry(width, height, 1);
  let mesh = new Mesh(geometry, material);
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  mesh.position.z = graphSize - (width * glossaireScale) / 2;
  mesh.position.y = graphSize - (height * glossaireScale) / 2;
  mesh.position.x = -0.5;
  mesh.rotation.y = Math3.degToRad(90);

  mesh.scale.x = glossaireScale;
  mesh.scale.y = glossaireScale;
  mesh.scale.z = glossaireScale;

  scene.add(mesh);

  // make an invisible plane for the DOM element to chop
  // clip a WebGL geometry with it.
  material = new MeshPhongMaterial({
    opacity: 1,
    color: new Color(0x000000),
    blending: MultiplyBlending,
    side: DoubleSide
  });
  geometry = new BoxGeometry(width, height, 1);
  mesh = new Mesh(geometry, material);
  mesh.castShadow = true;
  mesh.receiveShadow = true;

  mesh.position.z = graphSize - (width * glossaireScale) / 2;
  mesh.position.y = graphSize - (height * glossaireScale) / 2;
  mesh.position.x = 0.1;
  mesh.rotation.y = Math3.degToRad(90);

  mesh.scale.x = glossaireScale;
  mesh.scale.y = glossaireScale;
  mesh.scale.z = glossaireScale;

  scene.add(mesh);
}

function createGrid() {
  const backgroundAxisLineWidth = 0.4;

  // Background Axis border X
  const line1 = new Geometry();
  line1.vertices.push(new Vector3(0, 0, 0));
  line1.vertices.push(new Vector3(100, 0, 0));
  scene.add(createLine(line1, backgroundAxisLineWidth));

  // Background Axis border Y - back
  const line2 = new Geometry();
  line2.vertices.push(new Vector3(0, 0, 0));
  line2.vertices.push(new Vector3(0, 100, 0));
  scene.add(createLine(line2, backgroundAxisLineWidth));

  // Background Axis border Y - left
  const line3 = new Geometry();
  line3.vertices.push(new Vector3(0, 0, 100));
  line3.vertices.push(new Vector3(0, 100, 100));
  scene.add(createLine(line3, backgroundAxisLineWidth));

  // Axis border Y
  const line4 = new Geometry();
  line4.vertices.push(new Vector3(100, 0, 0));
  line4.vertices.push(new Vector3(100, 100, 0));
  scene.add(createLine(line4, axisLineWidth));

  // Background Axis border Z
  const line5 = new Geometry();
  line5.vertices.push(new Vector3(0, 0, 0));
  line5.vertices.push(new Vector3(0, 0, 100));
  scene.add(createLine(line5, backgroundAxisLineWidth));

  // Axis border X
  const line6 = new Geometry();
  line6.vertices.push(new Vector3(0, 0, 100));
  line6.vertices.push(new Vector3(100, 0, 100));
  scene.add(createLine(line6, axisLineWidth));

  // Axis border Z
  const line7 = new Geometry();
  line7.vertices.push(new Vector3(100, 0, 0));
  line7.vertices.push(new Vector3(100, 0, 100));
  scene.add(createLine(line7, axisLineWidth));
}

function createLabelsAndLines() {
  // @ts-ignore
  window.resetScale(scale);

  const zLabelsGroup = new Group();
  createLowerAxisLabelAndLines(zLabelsGroup);
  zLabelsGroup.translateOnAxis(new Vector3(1, 0, 1), 100);
  zLabelsGroup.rotation.x = Math3.degToRad(-90);
  scene.add(zLabelsGroup);

  const xLabelsGroup = new Group();
  createLowerAxisLabelAndLines(xLabelsGroup, "left");
  xLabelsGroup.translateOnAxis(new Vector3(1, 0, 1), graphSize);
  xLabelsGroup.rotation.z = Math3.degToRad(90);
  xLabelsGroup.rotation.x = Math3.degToRad(-90);
  scene.add(xLabelsGroup);
}

function createLowerAxisLabelAndLines(group, facing = "right") {
  let count = 0;
  let maxWidth = 0;

  let textMaterial = new MeshBasicMaterial({
    color: gridColor,
    depthTest: false
  });
  for (let i = 1; i <= uCount; i++) {
    const labelName = uCountLabel[i - 1];

    const countStep = uCount;

    const stepHeight = 100 / countStep;

    // Grid lines
    const line = new Geometry();
    line.vertices.push(new Vector3(0, stepHeight * count + stepHeight / 2, 0));
    line.vertices.push(
      new Vector3(
        facing === "right" ? -100 : 100,
        stepHeight * count + stepHeight / 2,
        0
      )
    );
    group.add(createLine(line, gridLineSize));

    // Main notch
    let lineGeo = new Geometry();
    lineGeo.vertices.push(
      new Vector3(0, stepHeight * count + stepHeight / 2, 0)
    );
    lineGeo.vertices.push(
      new Vector3(
        facing === "right" ? 2 : -2,
        stepHeight * count + stepHeight / 2,
        0
      )
    );
    const mainNotch = createLine(lineGeo, 1, 0.8, gridColor);
    group.add(mainNotch);

    // Mid notch
    lineGeo = new Geometry();
    lineGeo.vertices.push(
      new Vector3(0, stepHeight + stepHeight * count - (stepHeight / 2) * 2, 0)
    );
    lineGeo.vertices.push(
      new Vector3(
        facing === "right" ? 1.5 : -1.5,
        stepHeight + stepHeight * count - (stepHeight / 2) * 2,
        0
      )
    );
    const midNotch = createLine(lineGeo, 0.8, 0.8, gridColor);
    group.add(midNotch);

    // step label
    const textGeo = new TextGeometry(labelName, {
      size: 4,
      height: 0,
      curveSegments: 6,
      font
    });

    const textAxisStep = new Mesh(textGeo, textMaterial.clone());
    textGeo.computeBoundingBox();
    let textWidth = textGeo.boundingBox.max.x - textGeo.boundingBox.min.x;
    let textHeight = textGeo.boundingBox.max.y - textGeo.boundingBox.min.y;
    if (textWidth > maxWidth) {
      maxWidth = textWidth;
    }

    textAxisStep.translateOnAxis(new Vector3(0, -1, 0), textHeight / 2); // center

    if (facing === "right") {
      textAxisStep.translateOnAxis(new Vector3(1, 0, 0), 3); // add padding-left
    } else {
      textAxisStep.translateOnAxis(
        new Vector3(-1, 0, 0),
        textWidth + paddingLabel
      ); // add padding-right
    }

    textAxisStep.translateOnAxis(
      new Vector3(0, 1, 0),
      stepHeight * count + stepHeight / 2
    ); // align with current step
    group.add(textAxisStep);
    count++;
  }

  // Axis label
  const textGeoAxisName = new TextGeometry(
    facing === "right" ? "Products count (spaces)" : "Users count",
    {
      size: 4,
      height: 0,
      curveSegments: 6,
      font: fontBold
    }
  );

  const textAxisName = new Mesh(textGeoAxisName, textMaterial.clone());

  textGeoAxisName.computeBoundingBox();

  let textWidth =
    textGeoAxisName.boundingBox.max.x - textGeoAxisName.boundingBox.min.x;
  let textHeight =
    textGeoAxisName.boundingBox.max.y - textGeoAxisName.boundingBox.min.y;

  if (facing === "right") {
    textAxisName.rotation.z = Math3.degToRad(90);
    textAxisName.translateOnAxis(
      new Vector3(0, -1, 0),
      maxWidth + paddingLabel + textHeight
    ); // padding top
    textAxisName.position.y = graphSize / 2 - textWidth / 2; // center
  } else {
    textAxisName.rotation.z = Math3.degToRad(-90);
    textAxisName.translateOnAxis(
      new Vector3(0, -1, 0),
      maxWidth + paddingLabel + textHeight + textHeight / 2
    ); // padding top
    textAxisName.position.y = graphSize / 2 + textWidth / 2; // center
  }

  group.add(textAxisName);
}

function createYAxisLabelAndLines(group, facing = "right") {
  let count = 0;
  let maxWidth = 0;

  let textMaterial = new MeshBasicMaterial({
    color: gridColor,
    depthTest: false
  });

  for (let i = 0; i <= upperBound; i += tickSpacing) {
    const countStep = upperBound / tickSpacing;
    const stepHeight = 100 / countStep;

    // Grid lines
    const line = new Geometry();
    line.vertices.push(new Vector3(0, stepHeight * count, 0));
    line.vertices.push(new Vector3(-100, stepHeight * count, 0));
    line.vertices.push(new Vector3(-100, stepHeight * count, 100));
    group.add(createLine(line, gridLineSize));

    // Main notch
    let lineGeo = new Geometry();
    lineGeo.vertices.push(new Vector3(0, stepHeight * count, 0));
    lineGeo.vertices.push(new Vector3(2, stepHeight * count, 0));
    const mainNotch = createLine(lineGeo, 1, 0.8, gridColor);
    group.add(mainNotch);

    // Mid notch
    if (i !== 0) {
      lineGeo = new Geometry();
      lineGeo.vertices.push(
        new Vector3(0, stepHeight * count - stepHeight / 2, 0)
      );
      lineGeo.vertices.push(
        new Vector3(1.5, stepHeight * count - stepHeight / 2, 0)
      );
      const midNotch = createLine(lineGeo, 0.8, 0.8, gridColor);
      group.add(midNotch);
    }

    // step label
    const label =
      scale === "s" ? (i / 1000).toString() + "s" : i.toString() + "ms";
    const textGeo = new TextGeometry(label, {
      size: 4,
      height: 0,
      curveSegments: 6,
      font
    });

    const textAxisStep = new Mesh(textGeo, textMaterial.clone());

    textGeo.computeBoundingBox();

    let textWidth = textGeo.boundingBox.max.x - textGeo.boundingBox.min.x;
    let textHeight = textGeo.boundingBox.max.y - textGeo.boundingBox.min.y;

    if (textWidth > maxWidth) {
      maxWidth = textWidth;
    }

    textAxisStep.translateOnAxis(new Vector3(0, -1, 0), textHeight / 2); // center
    textAxisStep.translateOnAxis(new Vector3(1, 0, 0), 3); // add padding-left
    textAxisStep.translateOnAxis(new Vector3(0, 1, 0), stepHeight * count); // align with current step

    group.add(textAxisStep);

    count++;
  }

  // Axis label
  const textGeoAxisName = new TextGeometry(
    "Duration in " + (scale === "s" ? "seconds" : "milliseconds"),
    {
      size: 4,
      height: 0,
      curveSegments: 6,
      font: fontBold
    }
  );

  const textAxisName = new Mesh(textGeoAxisName, textMaterial.clone());

  textGeoAxisName.computeBoundingBox();

  let textWidth =
    textGeoAxisName.boundingBox.max.x - textGeoAxisName.boundingBox.min.x;
  let textHeight =
    textGeoAxisName.boundingBox.max.y - textGeoAxisName.boundingBox.min.y;

  textAxisName.rotation.z = Math3.degToRad(90);
  textAxisName.translateOnAxis(
    new Vector3(0, -1, 0),
    maxWidth + paddingLabel + textHeight
  ); // padding top
  textAxisName.position.y = graphSize / 2 - textWidth / 2; // center

  group.add(textAxisName);
}

function createLine(geo, lineWidth = 1, opacity = 0.8, color?) {
  const g = new MeshLine();
  g.setGeometry(geo);

  const material = new MeshLineMaterial({
    color: color || gridColor,
    opacity,
    lineWidth,
    transparent: true
  });

  const mesh = new Mesh(g.geometry, material);
  return mesh;
}

function createLight() {
  const ambient = new AmbientLight(0x999999);
  const spot = new SpotLight(0xffffff, 0.3);

  spot.position.set(200, 200, 0);
  spot.lookAt(cameraDirection);
  spot.castShadow = true;
  spot.shadow.mapSize = new Vector2(2048, 2048);

  scene.add(ambient, spot);
}

function createBars() {
  const barGroup = new Group();

  for (let u = 1; u <= uCount; u++) {
    for (let n = 1; n <= nCount; n++) {
      const barData = data[uCountLabel[u - 1]][nCountLabel[n - 1]];
      const keys = Object.keys(barData);
      let heightSoFar = 0;
      const barStackGroup = new Group();

      for (let i = 0; i < keys.length; i++) {
        const actionName = keys[i];
        const actionHeight = (barData[actionName] * 100) / upperBound;

        const countStep = uCount;
        const stepHeight = 100 / countStep;
        const placex = stepHeight * u - stepHeight / 2;
        const placez = stepHeight * n - stepHeight / 2;
        const geometry = new CylinderGeometry(2, 2, actionHeight, 20);
        let color = new Color(colors[actionName]);
        const material = new MeshPhongMaterial({
          color
        });
        const bar = new Mesh(geometry, material);
        bar.position.x = placex;
        bar.position.z = placez;
        bar.position.y = heightSoFar + actionHeight / 2;

        heightSoFar += actionHeight;
        bar.name = "bar-" + u;
        bar.castShadow = true;
        bar.receiveShadow = true;

        barStackGroup.add(bar);
        barStackGroup.scale.y = 0.01;
      }

      new TweenMax.to(barStackGroup.scale, 1, {
        ease: Elastic.easeOut.config(2, 5),
        y: 1,
        delay: 0.5
      });
      barGroup.add(barStackGroup);
    }
  }

  // reverse the bars to matche the axis orientaion
  barGroup.rotation.y = Math3.degToRad(-180);
  barGroup.position.x = 100;
  barGroup.position.z = 100;
  scene.add(barGroup);
}

///////////////////////
// Render            //
///////////////////////

function render() {
  requestAnimationFrame(render);
  renderer.render(scene, camera);
  rendererCss.render(sceneCss, camera);
}

const fontLoader = new FontLoader();
// const templateGlossaire = pug.compileFile("./templateGlossaire.pug", {});

fontLoader.load(
  "./public/fonts/droid/droid_serif_regular.typeface.json",
  function(jsonFont) {
    font = jsonFont;

    fontLoader.load(
      "./public/fonts/droid/droid_serif_bold.typeface.json",
      function(jsonFont2) {
        fontBold = jsonFont2;

        init();
        render();
      }
    );
  }
);

// Helpers stolen on github and converted to TS that help figure out the best bound and steps for our graph
class niceScale {
  private maxTicks: number;
  private tickSpacing: number;
  private range: number;
  private niceLowerBound: number;
  private niceUpperBound: number;
  private lowerBound: number;
  private upperBound: number;

  constructor(lowerBound, upperBound, maxTicks) {
    this.maxTicks = maxTicks || 10;
    this.lowerBound = lowerBound;
    this.upperBound = upperBound;
  }

  /**
   * setMaxTicks
   */
  public setMaxTicks(maxTicks) {
    this.maxTicks = maxTicks;
    this.calculate();
  }

  public setMinMaxPoints(min, max) {
    this.lowerBound = min;
    this.upperBound = max;
    this.calculate();
  }

  public getNiceUpperBound() {
    return this.niceUpperBound;
  }

  public getNiceLowerBound() {
    return this.niceLowerBound;
  }

  public getTickSpacing() {
    return this.tickSpacing;
  }

  public calculate() {
    this.range = this.niceNum(this.upperBound - this.lowerBound, false);
    this.tickSpacing = this.niceNum(this.range / (this.maxTicks - 1), true);
    this.niceLowerBound =
      Math.floor(this.lowerBound / this.tickSpacing) * this.tickSpacing;
    this.niceUpperBound =
      Math.ceil(this.upperBound / this.tickSpacing) * this.tickSpacing;
  }

  private niceNum(range, round) {
    const exponent = Math.floor(Math.log10(range));
    const fraction = range / Math.pow(10, exponent);
    let niceFraction;

    if (round) {
      if (fraction < 1.5) niceFraction = 1;
      else if (fraction < 3) niceFraction = 2;
      else if (fraction < 7) niceFraction = 5;
      else niceFraction = 10;
    } else {
      if (fraction <= 1) niceFraction = 1;
      else if (fraction <= 2) niceFraction = 2;
      else if (fraction <= 5) niceFraction = 5;
      else niceFraction = 10;
    }

    return niceFraction * Math.pow(10, exponent);
  }
}

function measureHTMLElement(el, fn) {
  const pV = el.style.visibility,
    pP = el.style.position;

  // el.style.visibility = "hidden";
  // el.style.position = "absolute";

  document.body.appendChild(el);
  const result = fn(el);
  // el.parentNode.removeChild(el);

  el.style.visibility = pV;
  el.style.position = pP;

  return result;
}
