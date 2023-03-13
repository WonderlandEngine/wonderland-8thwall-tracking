/**
 * /!\ This file is auto-generated.
 *
 * This is the entry point of your standalone application.
 *
 * You should register the component you need here, e.g.,
 *
 * ```
 * import { MyComponent } from './my-component.js';
 *
 * WL.registerComponent(MyComponent);
 * ```
 *
 * The `wle:auto-imports:start` and `wle:auto-imports:end` comments are
 * used by the editor as a target for the import list.
 */

/* wle:auto-imports:start */
import '@wonderlandengine/components';
/* wle:auto-imports:end */

import '../../common-components';

import './image-tracker';
import './physical-size-image-target';
import './video-texture-image-target';
import './video-textures-fixed';


import { ARImageTrackingCamera } from '../../../src/components/AR/cameras/AR-image-tracking-camera';
WL.registerComponent(ARImageTrackingCamera);




