import * as THREE from "https://threejsfundamentals.org/threejs/resources/threejs/r127/build/three.module.js";

import { GLTFLoader } from "https://cdn.skypack.dev/three@0.136.0/examples/jsm/loaders/GLTFLoader.js";

const videoElement = document.getElementsByClassName("input_video")[0];
const canvasElement = document.getElementsByClassName("output_canvas")[0];

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
  const camera2 = new THREE.OrthographicCamera(0.5, 0.5, 0.5, 0.5);
  camera.position.z = 2;

  const scene = new THREE.Scene();

  const scale = 2 * Math.sqrt(window.innerWidth / 1000);
  console.log(scale);
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
  loader.load("uploads_files_3208104_vr.glb", function (gltf) {
    glasses.add(gltf.scene);
    glasses.scale.set(scale - 2, scale - 2, scale - 2);
    //mobile 1.8
    glasses.rotation.set(0, 160, 0);
    scene.add(glasses);
  });
  loader.load("./trial2.glb", function (gltf) {
    occluder.add(gltf.scene);
    occluder.scale.set(scale - 0.8, scale - 0.8, scale - 0.8);
    //mobile 1.5
    occluder.rotation.set(0, 160, 0);
    occluder.traverse((child) => {
      if (child.type === "Mesh") {
        const material = child.material;
        // Do stuff with the material
        material.colorWrite = false;
        material.transparent = false;
      }
    });
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
    scale,
  };
}
const width = window.innerWidth;
const height = window.innerHeight;
initVideo(videoElement, 100, 100);
const threeApp = initThreeApp(canvasElement, 100, 100);
const onResults = function (res) {
  const landmarks = res.multiFaceLandmarks;
  if (!landmarks) return;
  const { x, y, z } = landmarks[0][9];
  // landmarks[0][6] == nose position(eyes center point)
  // use landmarks xy value to calculate the screen xy
  let vec = new THREE.Vector3();
  let pos = new THREE.Vector3();
  vec.set(x * 2 - 1, -y * 2 + 1, 0.5);
  vec.unproject(threeApp.camera);
  vec.sub(threeApp.camera.position).normalize();
  let distance = -threeApp.camera.position.z / vec.z;
  pos.copy(threeApp.camera.position).add(vec.multiplyScalar(distance));
  threeApp.glasses.position.setX(pos.x);
  threeApp.glasses.position.setY(pos.y);
  threeApp.glasses.position.setZ(pos.z);
  // console.log("z=" + z);
  // console.log(pos.z);
  threeApp.occluder.position.setX(pos.x);
  threeApp.occluder.position.setY(pos.y);
  threeApp.occluder.position.setZ(pos.z - 1.5);
  // todo
  // rotate of model?
};

faceMesh.onResults(onResults);

const run = async function () {
  threeApp.render();
  await faceMesh.send({ image: videoElement });
  requestAnimationFrame(run);
};

document.getElementById("run").addEventListener("click", run);

function initVideo(video, w, h) {
  const wid = window.innerWidth;
  const hei = window.innerHeight;
  if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
    const constraints = {
      video: {
        width: "wid",
        height: "hei",
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
