# V36C → V43B donor map

V36C remains the behavioral reference, not the runtime architecture.

## Reused concepts

| V36C behavior | V43B implementation |
|---|---|
| `prepareImported` removes embedded cameras/lights and repairs material defaults | `RendererService.prepareImported` |
| `normalizeObject` computes a bounding box, target scale and center | `RendererService.computeAutoTransform` |
| Hero, environment and secondary assets occupy distinct scene roots | `hero-proxy`, `environment-proxy`, dynamic `prop-*` nodes |
| PMREM conversion of an equirectangular HDR texture | `RendererService.loadHDRI` |
| Studio reflection fallback prevents metallic assets from becoming black | `RendererService.createStudioEnvironment` |
| Camera safety is derived from subject bounds | Shot-camera fit distance and safe near/far planes |
| Work viewport has grid, bounds, camera and light helpers | V43B Editor Camera mode |
| Asset correction must not destroy creative motion | Creative → Correction → Auto Normalize → Content hierarchy |
| Imported assets and project metadata survive reload | IndexedDB `assets` + `projects` object stores |

## Deliberately not copied

- the single-file architecture;
- TEST/BANCO/DEF runtime modes;
- old export matrices;
- duplicate render systems;
- V36C layout overrides accumulated across many polish passes;
- legacy global mutable scene state.

V43B expresses the useful V36C behavior through the shared Store, commands, Renderer Service and dedicated workspaces established in V43A.1.
