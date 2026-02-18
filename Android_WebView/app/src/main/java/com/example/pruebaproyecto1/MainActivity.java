package com.example.pruebaproyecto1;

import android.animation.ArgbEvaluator;
import android.animation.ValueAnimator;
import android.content.Intent;
import android.content.res.ColorStateList;
import android.graphics.Color;
import android.net.Uri;
import android.os.Bundle;
import android.view.Menu;
import android.view.MenuItem;
import android.view.View;
import android.view.ViewGroup;
import android.view.animation.OvershootInterpolator;
import android.webkit.ValueCallback;
import android.webkit.WebChromeClient;
import android.webkit.WebSettings;
import android.webkit.WebView;
import android.webkit.WebViewClient;
import android.widget.ImageView;
import android.widget.TextView;

import androidx.activity.EdgeToEdge;
import androidx.activity.result.ActivityResultLauncher;
import androidx.activity.result.contract.ActivityResultContracts;
import androidx.appcompat.app.AppCompatActivity;
import androidx.core.content.ContextCompat;
import androidx.core.graphics.Insets;
import androidx.core.view.ViewCompat;
import androidx.core.view.WindowInsetsCompat;
import androidx.transition.Fade;
import androidx.transition.TransitionManager;
import androidx.transition.TransitionSet;

import com.google.android.material.bottomnavigation.BottomNavigationItemView;
import com.google.android.material.bottomnavigation.BottomNavigationMenuView;

public class MainActivity extends AppCompatActivity {

    private TextView textDisplay;
    private WebView webViewContent;
    private ViewGroup mainContainer;
    private CurvedBottomNavigationView bottomNavigationView;
    private View selectedCircle;
    private ImageView floatingIcon;
    private int currentColor;

    private ValueCallback<Uri[]> uploadMessage;
    private ActivityResultLauncher<Intent> filePickerLauncher;
    private boolean isProgrammaticSelection = false;
    private String lastLoadedUrl = ""; // Evita recargas innecesarias

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        EdgeToEdge.enable(this);
        setContentView(R.layout.activity_main);

        // Registro para selección de archivos
        filePickerLauncher = registerForActivityResult(
                new ActivityResultContracts.StartActivityForResult(),
                result -> {
                    if (uploadMessage == null) return;
                    Uri[] results = null;
                    if (result.getResultCode() == RESULT_OK && result.getData() != null) {
                        if (result.getData().getData() != null) {
                            results = new Uri[]{result.getData().getData()};
                        }
                    }
                    uploadMessage.onReceiveValue(results);
                    uploadMessage = null;
                }
        );

        // Referencias UI
        mainContainer = findViewById(R.id.main);
        textDisplay = findViewById(R.id.text_display);
        webViewContent = findViewById(R.id.webview_content);
        bottomNavigationView = findViewById(R.id.bottom_navigation);
        selectedCircle = findViewById(R.id.selected_circle);
        floatingIcon = findViewById(R.id.floating_icon);

        // Color inicial (El morado claro unificado)
        currentColor = ContextCompat.getColor(this, R.color.nav_active_circle);
        selectedCircle.setBackgroundTintList(ColorStateList.valueOf(currentColor));

        // ============ CONFIGURACIÓN DE RENDIMIENTO WEBVIEW ============
        WebSettings webSettings = webViewContent.getSettings();

        // Habilitar funciones base
        webSettings.setJavaScriptEnabled(true);
        webSettings.setDomStorageEnabled(true);
        webSettings.setAllowFileAccess(true);
        webSettings.setAllowContentAccess(true);

        // OPTIMIZACIÓN CRÍTICA DE VELOCIDAD
        // LOAD_DEFAULT: Usa la caché del disco si está disponible. Esto hace que
        // la navegación sea casi instantánea después de la primera vez.
        webSettings.setCacheMode(WebSettings.LOAD_DEFAULT);

        // ACELERACIÓN DE HARDWARE
        // Fuerza el uso de la GPU para renderizar animaciones CSS y scroll suave.
        webViewContent.setLayerType(View.LAYER_TYPE_HARDWARE, null);

        // Optimizaciones adicionales
        webSettings.setRenderPriority(WebSettings.RenderPriority.HIGH); // Prioridad alta al renderizado
        webSettings.setEnableSmoothTransition(true); // Transiciones suaves
        // ============================================================

        webViewContent.setWebViewClient(new WebViewClient() {
            @Override
            public void onPageFinished(WebView view, String url) {
                super.onPageFinished(view, url);
                lastLoadedUrl = url;
            }

            @Override
            public void doUpdateVisitedHistory(WebView view, String url, boolean isReload) {
                super.doUpdateVisitedHistory(view, url, isReload);
                syncMenuWithUrl(url);
            }
        });

        webViewContent.setWebChromeClient(new WebChromeClient() {
            @Override
            public boolean onShowFileChooser(WebView webView, ValueCallback<Uri[]> filePathCallback, FileChooserParams fileChooserParams) {
                if (uploadMessage != null) {
                    uploadMessage.onReceiveValue(null);
                }
                uploadMessage = filePathCallback;
                Intent intent = new Intent(Intent.ACTION_GET_CONTENT);
                intent.addCategory(Intent.CATEGORY_OPENABLE);
                intent.setType("*/*");
                filePickerLauncher.launch(Intent.createChooser(intent, "Selecciona reporte CSV"));
                return true;
            }
        });

        ViewCompat.setOnApplyWindowInsetsListener(mainContainer, (v, insets) -> {
            Insets systemBars = insets.getInsets(WindowInsetsCompat.Type.systemBars());
            v.setPadding(systemBars.left, systemBars.top, systemBars.right, 0);
            return insets;
        });

        bottomNavigationView.setOnItemSelectedListener(item -> {
            if (isProgrammaticSelection) {
                isProgrammaticSelection = false;
                return true;
            }

            String newText = "";
            int itemId = item.getItemId();
            int iconRes = 0;
            // SIEMPRE USAMOS EL MISMO COLOR UNIFICADO
            int newColorRes = R.color.nav_active_circle;
            String urlToLoad = null;

            if (itemId == R.id.navigation_inicio) {
                newText = ""; iconRes = R.drawable.ic_home;
                urlToLoad = "https://bifrost.free.nf/inicio/";
            } else if (itemId == R.id.navigation_datos) {
                newText = ""; iconRes = R.drawable.ic_datos;
                urlToLoad = "https://bifrost.free.nf/reports/";
            } else if (itemId == R.id.navigation_predict) {
                newText = ""; iconRes = R.drawable.ic_predict;
                urlToLoad = "https://bifrost.free.nf/predict/";
            } else if (itemId == R.id.navigation_reportes) {
                newText = ""; iconRes = R.drawable.ic_reportes;
                urlToLoad = "https://bifrost.free.nf/upload/";
            } else if (itemId == R.id.navigation_dashboard) {
                newText = ""; iconRes = R.drawable.ic_dashboard;
                urlToLoad = "https://bifrost.free.nf/dashboard/?i=1";
            }

            if (urlToLoad != null) {
                textDisplay.setVisibility(View.GONE);
                webViewContent.setVisibility(View.VISIBLE);

                // Solo cargamos si la URL es diferente a la actual
                if (!urlToLoad.equals(lastLoadedUrl)) {
                    webViewContent.loadUrl(urlToLoad);
                }
            } else {
                webViewContent.setVisibility(View.GONE);
                textDisplay.setVisibility(View.VISIBLE);
                animateTextChange(newText);
            }

            moveCurveAndIcon(itemId, iconRes, newColorRes);
            return true;
        });

        // Carga inicial
        bottomNavigationView.post(() -> {
            bottomNavigationView.setSelectedItemId(R.id.navigation_inicio);
            moveCurveAndIcon(R.id.navigation_inicio, R.drawable.ic_home, R.color.nav_active_circle);
        });
    }

    private void syncMenuWithUrl(String url) {
        if (url == null) return;
        int idToSelect = -1;

        if (url.contains("/inicio/")) idToSelect = R.id.navigation_inicio;
        else if (url.contains("/reports/")) idToSelect = R.id.navigation_datos;
        else if (url.contains("/upload/")) idToSelect = R.id.navigation_reportes;
        else if (url.contains("/predict/")) idToSelect = R.id.navigation_predict;
        else if (url.contains("/dashboard/")) idToSelect = R.id.navigation_dashboard;

        if (idToSelect != -1 && bottomNavigationView.getSelectedItemId() != idToSelect) {
            isProgrammaticSelection = true;
            bottomNavigationView.setSelectedItemId(idToSelect);
        }
    }

    private void moveCurveAndIcon(int itemId, int iconRes, int colorResId) {
        BottomNavigationMenuView menuView = (BottomNavigationMenuView) bottomNavigationView.getChildAt(0);
        for (int i = 0; i < menuView.getChildCount(); i++) {
            BottomNavigationItemView itemView = (BottomNavigationItemView) menuView.getChildAt(i);
            if (itemView.getId() == itemId) {
                int x = itemView.getLeft() + itemView.getWidth() / 2;
                bottomNavigationView.setCurveCenterX(x);
                float targetX = x - (mainContainer.getWidth() / 2f);

                selectedCircle.animate().translationX(targetX).setDuration(300).setInterpolator(new OvershootInterpolator(1.0f)).start();
                animateColorChange(colorResId);

                floatingIcon.animate().translationX(targetX).alpha(0f).setDuration(150).withEndAction(() -> {
                    floatingIcon.setImageResource(iconRes);
                    floatingIcon.animate().alpha(1f).setDuration(150).start();
                }).start();
                break;
            }
        }

        Menu menu = bottomNavigationView.getMenu();
        for (int i = 0; i < menu.size(); i++) {
            MenuItem item = menu.getItem(i);
            if (item.getItemId() == itemId) {
                item.setIcon(android.R.color.transparent);
                item.setTitle("");
            } else {
                String originalTitle = "";
                int originalIcon = 0;

                if (item.getItemId() == R.id.navigation_inicio) { originalTitle = "Inicio"; originalIcon = R.drawable.ic_home; }
                else if (item.getItemId() == R.id.navigation_datos) { originalTitle = "Datos"; originalIcon = R.drawable.ic_datos; }
                else if (item.getItemId() == R.id.navigation_predict) { originalTitle = "Predict"; originalIcon = R.drawable.ic_predict; }
                else if (item.getItemId() == R.id.navigation_reportes) { originalTitle = "Reportes"; originalIcon = R.drawable.ic_reportes; }
                else if (item.getItemId() == R.id.navigation_dashboard) { originalTitle = "Dashboard"; originalIcon = R.drawable.ic_dashboard; }

                item.setIcon(originalIcon);
                item.setTitle(originalTitle);
            }
        }
    }

    private void animateColorChange(int newColorResId) {
        int colorTo = ContextCompat.getColor(this, newColorResId);
        ValueAnimator colorAnimation = ValueAnimator.ofObject(new ArgbEvaluator(), currentColor, colorTo);
        colorAnimation.setDuration(300);
        colorAnimation.addUpdateListener(animator -> {
            int animatedColor = (int) animator.getAnimatedValue();
            selectedCircle.getBackground().setTintList(ColorStateList.valueOf(animatedColor));
            currentColor = animatedColor;
        });
        colorAnimation.start();
        floatingIcon.setImageTintList(ColorStateList.valueOf(Color.WHITE));
    }

    private void animateTextChange(String newText) {
        if (textDisplay.getVisibility() == View.VISIBLE) {
            TransitionSet transition = new TransitionSet();
            transition.addTransition(new Fade());
            transition.setDuration(250);
            TransitionManager.beginDelayedTransition(mainContainer, transition);
            textDisplay.setText(newText);
        }
    }

    // ============ GESTIÓN DEL CICLO DE VIDA (OPTIMIZACIÓN DE MEMORIA) ============
    @Override
    protected void onPause() {
        super.onPause();
        if (webViewContent != null) {
            webViewContent.onPause();
            // Pausar timers ahorra mucha batería y CPU cuando la app no está visible
            webViewContent.pauseTimers();
        }
    }

    @Override
    protected void onResume() {
        super.onResume();
        if (webViewContent != null) {
            webViewContent.onResume();
            webViewContent.resumeTimers();
        }
    }

    @Override
    protected void onDestroy() {
        if (webViewContent != null) {
            // Limpieza agresiva para liberar memoria al cerrar
            webViewContent.loadUrl("about:blank");
            webViewContent.clearHistory();
            webViewContent.removeAllViews();
            webViewContent.destroy();
        }
        super.onDestroy();
    }
    // ==============================================================================
}