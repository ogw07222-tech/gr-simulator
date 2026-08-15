import * as THREE from "three";
import { describe, expect, it, vi } from "vitest";
import { MassObject } from "../../src/rendering/MassObject.js";

describe("MassObject presentation", () => {
  it("uses a black body and a translucent holographic-green horizon", () => {
    const object = new MassObject();
    expect(object.core.material).toBeInstanceOf(THREE.MeshBasicMaterial);
    expect(object.core.material.color.getHex()).toBe(0x000000);
    expect(object.horizon.material).toBeInstanceOf(THREE.ShaderMaterial);
    expect(object.horizon.material.fragmentShader).toContain("vec3(0.12, 1.0, 0.52)");
    object.setAppearance({ horizonOpacity: 0.3, emissiveIntensity: 1.4 });
    expect(object.horizon.material.uniforms.uOpacity.value).toBe(0.3);
    expect(object.horizon.material.uniforms.uRimIntensity.value).toBe(1.4);
  });

  it("keeps the black presentation body at 0.85 horizon radius and disposes every resource", () => {
    const object = new MassObject();
    object.updateSchwarzschildRadius(4);
    expect(object.horizon.scale.x).toBe(4);
    expect(object.core.geometry.parameters.radius * object.core.scale.x).toBeCloseTo(3.4);
    const coreGeometry = vi.spyOn(object.core.geometry, "dispose");
    const coreMaterial = vi.spyOn(object.core.material, "dispose");
    const horizonGeometry = vi.spyOn(object.horizon.geometry, "dispose");
    const horizonMaterial = vi.spyOn(object.horizon.material, "dispose");
    object.dispose();
    expect(coreGeometry).toHaveBeenCalledOnce();
    expect(coreMaterial).toHaveBeenCalledOnce();
    expect(horizonGeometry).toHaveBeenCalledOnce();
    expect(horizonMaterial).toHaveBeenCalledOnce();
  });
});
