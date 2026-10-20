# Third-party notices

Electron and its bundled Chromium/Node licenses are distributed in the portable application from the official Electron runtime (`LICENSE`, `LICENSES.chromium.html`).

xoshiro128** 1.1 is based on the public-domain implementation by David Blackman and Sebastiano Vigna. Source: https://prng.di.unimi.it/xoshiro128starstar.c . Their dedication permits use, modification, and distribution for any purpose, without warranty. The seed mixer and float conversion are documented in `core/engine.mjs`; the sequence is not Unity-compatible.

Unity and UnityEngine are trademarks/APIs of Unity Technologies. Unity is not bundled with GD Toolkit. The optional exporter calls the user's installed Unity Editor and preserves its previous Random.state.

The Unity-like simulation uses the Xorshift128 recurrence described by George Marsaglia with a separately specified seed expansion and float mapping. It is an independent implementation, not Unity source code, and does not promise sequence parity with Unity. Unity's documentation identifies Xorshift128 as its generator family: https://docs.unity3d.com/ScriptReference/Random.html .

Manrope Variable is bundled as `ui/fonts/Manrope.ttf` for offline UI typography, including Vietnamese. Copyright 2018 The Manrope Project Authors (https://github.com/sharanda/manrope). It is distributed unmodified under the SIL Open Font License 1.1; the complete copyright notice and license are in `ui/fonts/OFL-Manrope.txt`. This is the same licensed font asset used by LongVest, copied from its `web/fonts/Manrope.ttf` with its accompanying license. The recorded upstream source is Google Fonts: https://github.com/google/fonts/tree/main/ofl/manrope . Font provenance and SHA-256 are recorded in `ui/fonts/README.txt`.
