package com.example.pruebaproyecto1;

import android.animation.ObjectAnimator;
import android.animation.PropertyValuesHolder;
import android.content.Context;
import android.content.Intent;
import android.net.ConnectivityManager;
import android.net.NetworkInfo;
import android.os.Bundle;
import android.os.Handler;
import android.os.Looper;
import android.view.View;
import android.view.animation.AccelerateDecelerateInterpolator;
import android.view.animation.DecelerateInterpolator;
import android.widget.Button;
import android.widget.ProgressBar;
import android.widget.TextView;
import android.widget.Toast;

import androidx.activity.EdgeToEdge;
import androidx.appcompat.app.AppCompatActivity;
import androidx.core.graphics.Insets;
import androidx.core.view.ViewCompat;
import androidx.core.view.WindowInsetsCompat;

public class Splash extends AppCompatActivity {

    private ProgressBar progressBar;
    private TextView tvStatus;
    private Button btnRetry;
    private View blob1, blob2, logoCard;

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        EdgeToEdge.enable(this);
        setContentView(R.layout.activity_splash);

        // Referencias
        progressBar = findViewById(R.id.progressBar);
        tvStatus = findViewById(R.id.tvStatus);
        btnRetry = findViewById(R.id.btnRetry);
        blob1 = findViewById(R.id.blob1);
        blob2 = findViewById(R.id.blob2);
        logoCard = findViewById(R.id.logoCard);

        ViewCompat.setOnApplyWindowInsetsListener(findViewById(R.id.main), (v, insets) -> {
            Insets systemBars = insets.getInsets(WindowInsetsCompat.Type.systemBars());
            v.setPadding(systemBars.left, systemBars.top, systemBars.right, systemBars.bottom);
            return insets;
        });

        // 1. Iniciar Animaciones
        startAnimations();

        // 2. Iniciar el proceso de carga
        startLoadingProcess();

        btnRetry.setOnClickListener(v -> {
            btnRetry.setVisibility(View.GONE);
            progressBar.setVisibility(View.VISIBLE);
            tvStatus.setText("Reiniciando...");
            progressBar.setProgress(0);
            startLoadingProcess();
        });
    }

    private void startLoadingProcess() {
        // Animamos la barra de 0 a 100 en 2.5 segundos
        ObjectAnimator progressAnim = ObjectAnimator.ofInt(progressBar, "progress", 0, 100);
        progressAnim.setDuration(2500);
        progressAnim.setInterpolator(new DecelerateInterpolator());
        progressAnim.start();

        // Verificamos internet justo antes de que termine la barra
        new Handler(Looper.getMainLooper()).postDelayed(() -> {
            checkInternetAndNavigate();
        }, 2500);
    }

    private void checkInternetAndNavigate() {
        if (isConnected()) {
            tvStatus.setText("¡Conectado!");
            // Ir a BIENVENIDA (La Web)
            Intent intent = new Intent(Splash.this, Bienvenida.class);
            startActivity(intent);
            overridePendingTransition(android.R.anim.fade_in, android.R.anim.fade_out);
            finish();
        } else {
            // Error
            progressBar.setVisibility(View.GONE);
            tvStatus.setText("Sin conexión a Internet");
            tvStatus.setTextColor(getColor(android.R.color.holo_red_dark));
            btnRetry.setVisibility(View.VISIBLE);
            Toast.makeText(this, "Conéctate a internet para continuar", Toast.LENGTH_SHORT).show();
        }
    }

    private boolean isConnected() {
        ConnectivityManager cm = (ConnectivityManager) getSystemService(Context.CONNECTIVITY_SERVICE);
        if (cm != null) {
            NetworkInfo activeNetwork = cm.getActiveNetworkInfo();
            return activeNetwork != null && activeNetwork.isConnectedOrConnecting();
        }
        return false;
    }

    private void startAnimations() {
        // Fondo (Blobs)
        ObjectAnimator anim1 = ObjectAnimator.ofPropertyValuesHolder(blob1,
                PropertyValuesHolder.ofFloat("translationY", -100f, 0f, -100f));
        anim1.setDuration(6000).setRepeatCount(ObjectAnimator.INFINITE);
        anim1.start();

        // Logo Respirando
        ObjectAnimator animLogo = ObjectAnimator.ofPropertyValuesHolder(logoCard,
                PropertyValuesHolder.ofFloat("scaleX", 1f, 1.05f, 1f),
                PropertyValuesHolder.ofFloat("scaleY", 1f, 1.05f, 1f));
        animLogo.setDuration(2000).setRepeatCount(ObjectAnimator.INFINITE);
        animLogo.start();
    }
}