// Place this file in Assets/Editor. Requires the Unity Editor, no third-party package.
#if UNITY_EDITOR
using System;
using System.IO;
using System.Globalization;
using UnityEditor;
using UnityEngine;

public class GDToolkitRandomExporter : EditorWindow
{
    private int seed = 2026;
    private int samples = 1000000;
    [MenuItem("Tools/GD Toolkit/Export Random")]
    public static void ShowWindow() { GetWindow<GDToolkitRandomExporter>("GD Toolkit RNG"); }
    private void OnGUI()
    {
        GUILayout.Label("UnityEngine.Random → GD Toolkit", EditorStyles.boldLabel);
        seed = EditorGUILayout.IntField("Seed", seed);
        samples = EditorGUILayout.IntField("Samples (max 3,000,000)", samples);
        EditorGUILayout.HelpBox("Each visited pool consumes one Random.value, including guaranteed rolls. Export enough samples for nested pools. Unity's previous random state is restored after export.", MessageType.Info);
        if (GUILayout.Button("Export RNG JSON")) Export();
    }
    private void Export()
    {
        if (samples < 1 || samples > 3000000) { EditorUtility.DisplayDialog("GD Toolkit", "Samples must be 1–3,000,000.", "OK"); return; }
        string path = EditorUtility.SaveFilePanel("Export Unity RNG", "", "unity-rng-" + seed, "json");
        if (string.IsNullOrEmpty(path)) return;
        UnityEngine.Random.State previous = UnityEngine.Random.state;
        try
        {
            UnityEngine.Random.InitState(seed);
            using (var writer = new StreamWriter(path, false, new System.Text.UTF8Encoding(false)))
            {
                writer.Write("{\"source\":\"UnityEngine.Random.value\",\"unityVersion\":\"" + Application.unityVersion + "\",\"seed\":" + seed + ",\"values\":[");
                for (int i = 0; i < samples; i++)
                {
                    if (i > 0) writer.Write(',');
                    writer.Write(UnityEngine.Random.value.ToString("R", CultureInfo.InvariantCulture));
                }
                writer.Write("]}");
            }
            EditorUtility.RevealInFinder(path);
        }
        finally { UnityEngine.Random.state = previous; }
    }
}
#endif
