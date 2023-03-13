import '@wonderlandengine/components';

import '../../common-components';

import  './camera-switch-ui';
import  './face-attachment-point-example';
import  './image-tracker';
import  './slam-tracking-example';

import { ARFaceTrackingCamera } from '../../../src/components/AR/cameras/AR-face-tracking-camera';
import { ARImageTrackingCamera } from '../../../src/components/AR/cameras/AR-image-tracking-camera';
import { ARSLAMCamera } from '../../../src/components/AR/cameras/AR-SLAM-camera';

WL.registerComponent(ARFaceTrackingCamera);
WL.registerComponent(ARImageTrackingCamera);
WL.registerComponent(ARSLAMCamera);