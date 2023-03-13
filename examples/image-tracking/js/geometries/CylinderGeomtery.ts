/**
 * Generates data for Cylindrical geometry.
 * Port from https://github.com/mrdoob/three.js/blob/dev/src/geometries/CylinderGeometry.js
 * Modified to work with gl-matrix vectors
 */

import { vec2, vec3 } from "gl-matrix";

const generateCylinderGeometry = (radiusTop = 1, radiusBottom = 1, height = 1, radialSegments = 32, heightSegments = 1, openEnded = false, thetaStart = 0, thetaLength = Math.PI * 2) => {

  radialSegments = Math.floor(radialSegments);
  heightSegments = Math.floor(heightSegments);

  // buffers
  const indices: number[] = [];
  const vertices: number[] = [];
  const normals: number[] = [];
  const uvs: number[] = [];

  // helper variables
  let index = 0;
  const indexArray: number[][]= [];
  const halfHeight = height / 2;
  

  // generate geometry
  generateTorso();

  if (openEnded === false) {
    if (radiusTop > 0) generateCap(true);
    if (radiusBottom > 0) generateCap(false);
  }

  return {
    indices, vertices, normals, uvs
  }
  
  // build geometry

  /*this.setIndex( indices );
  this.setAttribute( 'position', new Float32BufferAttribute( vertices, 3 ) );
  this.setAttribute( 'normal', new Float32BufferAttribute( normals, 3 ) );
  this.setAttribute( 'uv', new Float32BufferAttribute( uvs, 2 ) );*/

  function generateTorso() {

    const normal = vec3.create();
    const vertex = vec3.create();


    // this will be used to calculate the normal
    const slope = (radiusBottom - radiusTop) / height;

    // generate vertices, normals and uvs

    for (let y = 0; y <= heightSegments; y++) {

      const indexRow: number[] = [];

      const v = y / heightSegments;

      // calculate the radius of the current row

      const radius = v * (radiusBottom - radiusTop) + radiusTop;

      for (let x = 0; x <= radialSegments; x++) {

        const u = x / radialSegments;

        const theta = u * thetaLength + thetaStart;

        const sinTheta = Math.sin(theta);
        const cosTheta = Math.cos(theta);

        // vertex

        vertex[0] = radius * sinTheta;
        vertex[1] = - v * height + halfHeight;
        vertex[2] = radius * cosTheta;
        vertices.push(vertex[0], vertex[1], vertex[2]);

        // normal
        vec3.normalize(normal, vec3.set(normal, sinTheta, slope, cosTheta));
        normals.push(normal[0], normal[1], normal[2]);

        // uv
        uvs.push(u, 1 - v);

        // save index of vertex in respective row
        indexRow.push(index++);
      }

      // now save vertices of the row in our index array
      indexArray.push(indexRow);

    }

    // generate indices
    for (let x = 0; x < radialSegments; x++) {

      for (let y = 0; y < heightSegments; y++) {

        // we use the index array to access the correct indices

        const a = indexArray[y][x];
        const b = indexArray[y + 1][x];
        const c = indexArray[y + 1][x + 1];
        const d = indexArray[y][x + 1];

        // faces
        indices.push(a, b, d);
        indices.push(b, c, d);

      }
    }
  }

  function generateCap(top: any) {

    // save the index of the first center vertex
    const centerIndexStart = index;

    const uv = vec2.create();
    const vertex = vec3.create();

    
    const radius = (top === true) ? radiusTop : radiusBottom;
    const sign = (top === true) ? 1 : - 1;

    // first we generate the center vertex data of the cap.
    // because the geometry needs one set of uvs per face,
    // we must generate a center vertex per face/segment

    for (let x = 1; x <= radialSegments; x++) {

      // vertex

      vertices.push(0, halfHeight * sign, 0);

      // normal

      normals.push(0, sign, 0);

      // uv

      uvs.push(0.5, 0.5);

      // increase index

      index++;

    }

    // save the index of the last center vertex
    const centerIndexEnd = index;

    // now we generate the surrounding vertices, normals and uvs

    for (let x = 0; x <= radialSegments; x++) {

      const u = x / radialSegments;
      const theta = u * thetaLength + thetaStart;

      const cosTheta = Math.cos(theta);
      const sinTheta = Math.sin(theta);

      // vertex

      vertex[0] = radius * sinTheta;
      vertex[1] = halfHeight * sign;
      vertex[2] = radius * cosTheta;
      vertices.push(vertex[0], vertex[1], vertex[2]);

      // normal

      normals.push(0, sign, 0);

      // uv

      uv[0] = (cosTheta * 0.5) + 0.5;
      uv[1] = (sinTheta * 0.5 * sign) + 0.5;
      uvs.push(uv[0], uv[1]);

      // increase index

      index++;

    }

    // generate indices

    for (let x = 0; x < radialSegments; x++) {

      const c = centerIndexStart + x;
      const i = centerIndexEnd + x;

      if (top === true) {

        // face top

        indices.push(i, i + 1, c);

      } else {

        // face bottom

        indices.push(i + 1, i, c);

      }
    }

  }
}

export { generateCylinderGeometry };