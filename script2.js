import * as THREE from "https://threejsfundamentals.org/threejs/resources/threejs/r127/build/three.module.js";
import { GLTFLoader } from "https://cdn.skypack.dev/three@0.136.0/examples/jsm/loaders/GLTFLoader.js";

const videoElement = document.getElementsByClassName("input_video")[0];
const canvasElement = document.getElementsByClassName("output_canvas")[0];
const loadingElement = document.getElementsByClassName("loading")[0];

const faceMesh = new FaceMesh({
  locateFile: (file) => {
    return `https://cdn.jsdelivr.net/npm/@mediapipe/face_mesh/${file}`;
  },
});
faceMesh.setOptions({
  maxNumFaces: 1,
  refineLandmarks: true,
  minDetectionConfidence: 0.5,
  minTrackingConfidence: 0.5,
});

function initThreeApp(canvas, w, h) {
  const renderer = new THREE.WebGLRenderer({
    canvas,
    alpha: true,
    antialias: true,
  });

  const fov = 75;
  const near = 0.01;
  const far = 1000;
  const camera = new THREE.PerspectiveCamera(fov, 1280 / 720, near, far);
  camera.position.z = 2;

  const scene = new THREE.Scene();

  const scales = 2 * Math.sqrt(window.innerWidth / 1000);
  // console.log(scales);
  function resize() {
    const width = window.innerWidth || 100;
    const height = window.innerHeight || 100;
    renderer.setSize(width, height);
    renderer.setPixelRatio(window.pixelRatio);
    if (camera.isPerspectiveCamera) {
      camera.aspect = width / height;
    }
    camera.updateProjectionMatrix();
  }

  function render() {
    requestAnimationFrame(render);
    renderer.render(scene, camera);
  }

  // initial resize and render
  resize();
  render();

  // add a light
  const color = 0xffffff;
  const intensity = 1;
  const glasses = new THREE.Object3D();
  const occluder = new THREE.Object3D();
  const light = new THREE.DirectionalLight(color, intensity);
  light.position.set(-1, 2, 4);
  scene.add(light);

  const loader = new GLTFLoader();
  loader.load("./uploads_files_3208104_vr.glb", function (gltf) {
    glasses.add(gltf.scene);
    glasses.rotation.set(0, 160, 0);
    scene.add(glasses);
  });
  loader.load("./trial2.glb", function (gltf) {
    occluder.add(gltf.scene);
    occluder.rotation.set(0, 160, 0);
    occluder.traverse((child) => {
      if (child.type === "Mesh") {
        const material = child.material;
        // material.colorWrite = false;
        material.transparent = false;
      }
    });
    occluder.scale.set(2,2,2)
    scene.add(occluder);
  });

  return {
    renderer,
    camera,
    scene,
    resize,
    render,
    glasses,
    occluder,
    scales
  };
}

initVideo(videoElement, 10, 10);
const threeApp = initThreeApp(canvasElement, 100, 100);
const onResults = function (res) {
  loadingElement.style.visibility = "hidden";
  const landmarks = res.multiFaceLandmarks;
  if (!landmarks) return;
  try {
  var p1 = landmarks[0][156];
  var p2 = landmarks[0][383];
  var distances = distanceVector(p1, p2);
  threeApp.glasses.scale.set(distances+threeApp.scales*0.22,distances+threeApp.scales*0.22,distances+threeApp.scales*0.22);
  threeApp.occluder.scale.set(distances + threeApp.scales*0.7, distances + threeApp.scales*0.7, distances + threeApp.scales*0.7);
  const { x, y, z } = landmarks[0][6];
  let vec = new THREE.Vector3();
  let pos = new THREE.Vector3();
  vec.set(x * 2 - 1, -y * 1 + 0.6 , 0.5);
  vec.unproject(threeApp.camera);
  vec.sub(threeApp.camera.position).normalize();
  let distance = -threeApp.camera.position.z / vec.z;
    pos.copy(threeApp.camera.position).add(vec.multiplyScalar(distance));
    threeApp.occluder.traverse((child) => {
      if (child.type === "Mesh") {
        const material = child.material;
        material.colorWrite = false;
      }
    });
  threeApp.glasses.position.setX(pos.x);
  threeApp.glasses.position.setY(pos.y);
  threeApp.glasses.position.setZ(pos.z);
  threeApp.occluder.position.setX(pos.x);
  threeApp.occluder.position.setY(pos.y);
  threeApp.occluder.position.setZ(pos.z - threeApp.scales * 0.7);

  }
  catch (error) {
    // console.log(error)
    run();
  }

  function distanceVector( v1, v2 )
  {
    var dx = v1.x - v2.x;
    var dy = v1.y - v2.y;
    var dz = v1.z - v2.z;
    return Math.sqrt( dx * dx + dy * dy + dz * dz );
  }
};

faceMesh.onResults(onResults);

const run = async function () {
  threeApp.render();
  await faceMesh.send({ image: videoElement });
  requestAnimationFrame(run);
};

// document.getElementById("run").addEventListener("click", run);
const video = document.querySelector('video');

video.onloadeddata = (event) => {
  window.addEventListener("load", run());
};


function initVideo(video, w, h) {
  const wid = window.innerWidth;
  const hei = window.innerHeight;
  if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
    const constraints = {
      video: {
        width: "screen.width",
        height: "screen.height",
        facingMode: "user",
      },
    };
    navigator.mediaDevices
      .getUserMedia(constraints)
      .then(function (stream) {
        // apply the stream to the video element used in the texture
        video.srcObject = stream;
        video.play();
      })
      .catch(function (error) {
        console.error("Unable to access the camera/webcam.", error);
      });
  } else {
    console.error("MediaDevices interface not available.");
  }
}