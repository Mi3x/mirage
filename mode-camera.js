// mode-camera.js — the fallback for browsers without WebXR (notably iPhone
// Safari). Live camera feed behind a transparent WebGL canvas, with the
// virtual camera rotated by the device's motion sensors so 3D objects appear
// fixed in world directions.

import * as THREE from "three";

export async function startCameraFeed(videoEl) {
  const stream = await navigator.mediaDevices.getUserMedia({
    video: { facingMode: "environment" },
    audio: false,
  });
  videoEl.srcObject = stream;
  videoEl.style.display = "block";
  await videoEl.play();
}

// iOS requires an explicit permission prompt for motion sensors,
// and it must be triggered by a user gesture (our Enter button).
export async function requestMotionPermission() {
  const D = window.DeviceOrientationEvent;
  if (D && typeof D.requestPermission === "function") {
    const state = await D.requestPermission();
    if (state !== "granted") throw new Error("Motion sensor permission denied.");
  }
}

// Orients a three.js camera from deviceorientation events.
// Convention: with heading 0 the camera looks north (-z), matching geo.js.
export class OrientationCamera {
  constructor(camera) {
    this.camera = camera;
    this.deviceQ = new THREE.Quaternion();
    this.screenQ = new THREE.Quaternion();
    this.worldQ = new THREE.Quaternion(-Math.sqrt(0.5), 0, 0, Math.sqrt(0.5)); // camera looks out the back of the device
    this.zee = new THREE.Vector3(0, 0, 1);
    this.euler = new THREE.Euler();
    this.headingDeg = null;

    this._onOrient = (e) => this._handle(e);
    // "absolute" gives compass-referenced alpha on Android; iOS provides
    // webkitCompassHeading on the regular event instead.
    window.addEventListener("deviceorientationabsolute", this._onOrient, true);
    window.addEventListener("deviceorientation", this._onOrient, true);
  }

  _handle(e) {
    if (e.alpha == null) return;
    let alpha = THREE.MathUtils.degToRad(e.alpha);
    const beta = THREE.MathUtils.degToRad(e.beta ?? 0);
    const gamma = THREE.MathUtils.degToRad(e.gamma ?? 0);

    // iOS: derive true compass heading.
    if (typeof e.webkitCompassHeading === "number") {
      alpha = THREE.MathUtils.degToRad(360 - e.webkitCompassHeading);
      this.headingDeg = Math.round(e.webkitCompassHeading);
    } else if (e.absolute || e.type === "deviceorientationabsolute") {
      this.headingDeg = Math.round((360 - e.alpha) % 360);
    }

    const orient = THREE.MathUtils.degToRad(
      (screen.orientation?.angle ?? window.orientation ?? 0)
    );

    this.euler.set(beta, alpha, -gamma, "YXZ");
    this.deviceQ.setFromEuler(this.euler);
    this.deviceQ.multiply(this.worldQ);
    this.screenQ.setFromAxisAngle(this.zee, -orient);
    this.deviceQ.multiply(this.screenQ);
    this.camera.quaternion.copy(this.deviceQ);
  }

  dispose() {
    window.removeEventListener("deviceorientationabsolute", this._onOrient, true);
    window.removeEventListener("deviceorientation", this._onOrient, true);
  }
}
