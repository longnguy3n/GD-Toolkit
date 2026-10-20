# Third-party notices

Electron and its bundled Chromium/Node licenses are distributed in the portable application from the official Electron runtime (`LICENSE`, `LICENSES.chromium.html`).

xoshiro128** 1.1 is based on the public-domain implementation by David Blackman and Sebastiano Vigna. Source: https://prng.di.unimi.it/xoshiro128starstar.c . Their dedication permits use, modification, and distribution for any purpose, without warranty. The seed mixer and float conversion are documented in `core/engine.mjs`; the sequence is not Unity-compatible.

Unity and UnityEngine are trademarks/APIs of Unity Technologies. Unity is not bundled with GD Toolkit. The optional exporter calls the user's installed Unity Editor and preserves its previous Random.state.

The Unity-like simulation uses the Xorshift128 recurrence described by George Marsaglia with a separately specified seed expansion and float mapping. It is an independent implementation, not Unity source code, and does not promise sequence parity with Unity. Unity's documentation identifies Xorshift128 as its generator family: https://docs.unity3d.com/ScriptReference/Random.html .

Inter Variable is bundled as `ui/fonts/InterVariable.woff2` for offline UI typography, including Vietnamese. Copyright (c) 2016 The Inter Project Authors (https://github.com/rsms/inter). It is distributed unmodified under the SIL Open Font License 1.1; the complete copyright notice and license are in `ui/fonts/Inter-OFL.txt`. The font and license were obtained from the official Inter repository, commit `353b61b9f4430d5f420d56605a6e7993e0941470`: https://github.com/rsms/inter/tree/353b61b9f4430d5f420d56605a6e7993e0941470 . Font source: `docs/font-files/InterVariable.woff2`.
