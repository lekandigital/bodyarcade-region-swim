/**
 * BodyArcade Shared World — boot (Checkpoint 01).
 *
 * Views:
 *  - `pool`: the GAMICO dolphin swims in the unmodified
 *    vendored demo pool mounted at K = 7.5 m/demo-unit, driven by the
 *    ported 120 Hz sim + keyboard/body swim controls.
 *  - `stock`: the pristine vendored jeantimex/threejs-water demo, mounted
 *    exactly as its own src/main.ts does — the untouched Checkpoint-00
 *    water-fidelity reference, byte-identical forever.
 *  - `credits`: the in-app CC-BY attribution panel (mandatory for the
 *    dolphin; mirrors repo-root CREDITS.md).
 *  - `region-preview` (Checkpoint 04A): graybox terrain preview of the baked
 *    authored region — an engineering view (no water, no pose runtime, no
 *    camera access), explicitly not the game look.
 *  - `region` (Checkpoint 05C): THE GAME VIEW — the approved dolphin swims
 *    the baked Twin Bay region under the ported WaterThreeJS procedural
 *    ocean (Gerstner surface, analytic-atmosphere sky, time-of-day cycle,
 *    linear-HDR post). Same body input/pose-runtime boot as the pool;
 *    append &debug=1 for the instrument overlay + ocean GUI.
 */

const params = new URLSearchParams(location.search);
const view = params.get('view') ?? 'region';

async function mountStock() {
  await import('../vendor/threejs-water/src/styles.css');
  const { WaterApp } = await import('../vendor/threejs-water/src/app/WaterApp');
  void new WaterApp().init();
  mountViewMenu();
}

async function mountPool() {
  await import('../vendor/threejs-water/src/styles.css');
  // the stock help panel belongs to the stock demo; the pool view gets a
  // minimal instrument overlay instead
  document.getElementById('help')?.remove();
  document.getElementById('help-toggle')?.remove();
  mountPoolOverlay('pool-overlay');

  const { startPoolGame } = await import('./game/game');
  await startPoolGame(document.getElementById('app')!);
  await bootPoseRuntime();
}

async function mountRegion() {
  await import('../vendor/threejs-water/src/styles.css');
  document.getElementById('help')?.remove();
  document.getElementById('help-toggle')?.remove();
  mountPoolOverlay('region-overlay');

  const { startRegionGame } = await import('./game/regionGame');
  await startRegionGame(document.getElementById('app')!, {
    debug: params.get('debug') === '1',
  });
  await bootPoseRuntime();
}

/**
 * PosePuppet runtime boot (Master §3.2, per 493dd24:apps/dolphin/src/main.ts):
 * the page owns its tracking pipeline; keyboard play fully survives a
 * denied/absent camera. LITE model — GPU budget goes to the water. Shared
 * verbatim by the pool and region game views.
 */
async function bootPoseRuntime() {
  const { createPoseRuntime } = await import('@bodyarcade/pose-runtime');
  const runtime = createPoseRuntime({
    model: 'lite',
    worker: true,
    captureSize: { width: 640, height: 360 },
    election: 'strict',
    forceExternal: params.get('pp') === 'companion',
  });
  if ((params.get('hud') ?? '0') !== '0') {
    const { mountPoseHud } = await import('@bodyarcade/pose-hud');
    const hud = mountPoseHud(runtime, { safeArea: { x: 12, y: 64 }, title: 'SWIM' });
    (window as unknown as { __PP_HUD: typeof hud }).__PP_HUD = hud;
  }
  (window as unknown as { __POSE_RT: typeof runtime }).__POSE_RT = runtime;
  void runtime.start();
}

function mountPoolOverlay(id: string) {
  const el = document.createElement('div');
  el.id = id;
  el.style.cssText =
    'position:fixed;left:12px;top:12px;z-index:10;color:#e8f4fa;' +
    'font:12px/1.7 ui-monospace,Menlo,monospace;text-shadow:0 1px 3px rgba(0,0,0,.6);' +
    'pointer-events:none;user-select:none;';
  el.innerHTML =
    'SHIFT kick · W/S pitch · A/D bank · Q/E trim · SPACE burst · X brake · R recenter<br>' +
    '<a href="?view=credits" style="color:#8fd4ff;pointer-events:auto">credits</a> — ' +
    'dolphin by GAMICO (CC-BY 4.0)';
  document.body.appendChild(el);
  mountViewMenu();
}

function mountViewMenu() {
  if (document.getElementById('view-menu-button')) return;
  const wrap = document.createElement('div');
  wrap.id = 'view-menu';
  wrap.style.cssText =
    'position:fixed;right:12px;top:12px;z-index:30;font:12px/1.4 ui-monospace,Menlo,monospace;';

  const button = document.createElement('button');
  button.id = 'view-menu-button';
  button.type = 'button';
  button.textContent = 'menu';
  button.setAttribute('aria-expanded', 'false');
  button.style.cssText =
    'color:#e8f4fa;background:rgba(6,14,20,.72);border:1px solid rgba(142,212,255,.45);' +
    'border-radius:6px;padding:7px 10px;cursor:pointer;text-transform:uppercase;letter-spacing:0;';

  const panel = document.createElement('nav');
  panel.id = 'view-menu-panel';
  panel.setAttribute('aria-label', 'views');
  panel.hidden = true;
  panel.style.cssText =
    'margin-top:6px;min-width:190px;background:rgba(6,14,20,.88);border:1px solid rgba(142,212,255,.35);' +
    'border-radius:6px;padding:6px;box-shadow:0 10px 30px rgba(0,0,0,.32);backdrop-filter:blur(8px);';

  const links = [
    ['Region swim', '?view=region&hud=0'],
    ['Region + HUD', '?view=region'],
    ['Region debug', '?view=region&debug=1'],
    ['Pool', '?view=pool'],
    ['Stock water', '?view=stock'],
    ['Region preview', '?view=region-preview'],
    ['Credits', '?view=credits'],
  ];
  for (const [label, href] of links) {
    const a = document.createElement('a');
    a.href = href;
    a.textContent = label;
    a.style.cssText =
      'display:block;color:#e8f4fa;text-decoration:none;padding:7px 8px;border-radius:4px;';
    a.addEventListener('mouseenter', () => {
      a.style.background = 'rgba(142,212,255,.14)';
    });
    a.addEventListener('mouseleave', () => {
      a.style.background = 'transparent';
    });
    panel.appendChild(a);
  }

  button.addEventListener('click', () => {
    panel.hidden = !panel.hidden;
    button.setAttribute('aria-expanded', String(!panel.hidden));
  });
  addEventListener('keydown', (event) => {
    if (event.key === 'Escape') {
      panel.hidden = true;
      button.setAttribute('aria-expanded', 'false');
    }
  });
  document.addEventListener('click', (event) => {
    if (!wrap.contains(event.target as Node)) {
      panel.hidden = true;
      button.setAttribute('aria-expanded', 'false');
    }
  });

  wrap.append(button, panel);
  document.body.appendChild(wrap);
}

async function mountRegionPreviewView() {
  document.getElementById('help')?.remove();
  document.getElementById('help-toggle')?.remove();
  mountViewMenu();
  const { mountRegionPreview } = await import('./world/regionPreview');
  await mountRegionPreview(document.getElementById('app')!);
}

async function mountCreditsView() {
  const { mountCredits } = await import('./credits');
  document.getElementById('help')?.remove();
  document.getElementById('help-toggle')?.remove();
  document.getElementById('loading')?.remove();
  mountViewMenu();
  mountCredits(document.getElementById('app')!);
}

if (view === 'stock') {
  void mountStock();
} else if (view === 'credits') {
  void mountCreditsView();
} else if (view === 'region-preview') {
  void mountRegionPreviewView();
} else if (view === 'region') {
  void mountRegion();
} else {
  if (view !== 'pool') {
    console.warn(`[shared-world] unknown view "${view}" — mounting pool`);
  }
  void mountPool();
}
