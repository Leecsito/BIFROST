package com.example.pruebaproyecto1;

import android.animation.ValueAnimator;
import android.content.Context;
import android.graphics.Canvas;
import android.graphics.Color;
import android.graphics.Paint;
import android.graphics.Path;
import android.graphics.Point;
import android.util.AttributeSet;
import android.util.TypedValue;

import com.google.android.material.bottomnavigation.BottomNavigationView;

public class CurvedBottomNavigationView extends BottomNavigationView {
    private Path mPath;
    private Paint mPaint;

    public int CURVE_CIRCLE_RADIUS;

    private Point mFirstCurveStartPoint = new Point();
    private Point mFirstCurveEndPoint = new Point();
    private Point mFirstCurveControlPoint1 = new Point();
    private Point mFirstCurveControlPoint2 = new Point();

    private Point mSecondCurveStartPoint = new Point();
    private Point mSecondCurveEndPoint = new Point();
    private Point mSecondCurveControlPoint1 = new Point();
    private Point mSecondCurveControlPoint2 = new Point();

    private int mNavigationBarWidth;
    private int mNavigationBarHeight;
    private float mCurveCenterX = -1;

    public CurvedBottomNavigationView(Context context) {
        super(context);
        init(context);
    }

    public CurvedBottomNavigationView(Context context, AttributeSet attrs) {
        super(context, attrs);
        init(context);
    }

    public CurvedBottomNavigationView(Context context, AttributeSet attrs, int defStyleAttr) {
        super(context, attrs, defStyleAttr);
        init(context);
    }

    private void init(Context context) {
        mPath = new Path();
        mPaint = new Paint();

        mPaint.setAntiAlias(true);
        mPaint.setStyle(Paint.Style.FILL_AND_STROKE);

        // AQUI ESTÁ EL CAMBIO: COLOR MORADO DE TU MARCA
        mPaint.setColor(Color.parseColor("#7551FF"));

        setBackgroundColor(Color.TRANSPARENT);

        int radioEnDp = 45;
        CURVE_CIRCLE_RADIUS = (int) TypedValue.applyDimension(
                TypedValue.COMPLEX_UNIT_DIP,
                radioEnDp,
                context.getResources().getDisplayMetrics()
        );
    }

    @Override
    protected void onSizeChanged(int w, int h, int oldw, int oldh) {
        super.onSizeChanged(w, h, oldw, oldh);
        mNavigationBarWidth = w;
        mNavigationBarHeight = h;

        if (mCurveCenterX == -1) {
            mCurveCenterX = w / 2f;
        }
        updatePath();
    }

    public void setCurveCenterX(float x) {
        ValueAnimator animator = ValueAnimator.ofFloat(mCurveCenterX, x);
        animator.setDuration(300);
        animator.addUpdateListener(animation -> {
            mCurveCenterX = (float) animation.getAnimatedValue();
            updatePath();
            invalidate();
        });
        animator.start();
    }

    private void updatePath() {
        mFirstCurveStartPoint.set((int) (mCurveCenterX - (CURVE_CIRCLE_RADIUS * 2)), 0);
        mFirstCurveEndPoint.set((int) mCurveCenterX, CURVE_CIRCLE_RADIUS + (CURVE_CIRCLE_RADIUS / 2));

        mSecondCurveStartPoint.set(mFirstCurveEndPoint.x, mFirstCurveEndPoint.y);
        mSecondCurveEndPoint.set((int) (mCurveCenterX + (CURVE_CIRCLE_RADIUS * 2)), 0);

        mFirstCurveControlPoint1.set(mFirstCurveStartPoint.x + CURVE_CIRCLE_RADIUS, 0);
        mFirstCurveControlPoint2.set(mFirstCurveEndPoint.x - CURVE_CIRCLE_RADIUS, mFirstCurveEndPoint.y);

        mSecondCurveControlPoint1.set(mSecondCurveStartPoint.x + CURVE_CIRCLE_RADIUS, mSecondCurveStartPoint.y);
        mSecondCurveControlPoint2.set(mSecondCurveEndPoint.x - CURVE_CIRCLE_RADIUS, 0);

        mPath.reset();
        mPath.moveTo(0, 0);
        mPath.lineTo(mFirstCurveStartPoint.x, mFirstCurveStartPoint.y);

        mPath.cubicTo(mFirstCurveControlPoint1.x, mFirstCurveControlPoint1.y,
                mFirstCurveControlPoint2.x, mFirstCurveControlPoint2.y,
                mFirstCurveEndPoint.x, mFirstCurveEndPoint.y);

        mPath.cubicTo(mSecondCurveControlPoint1.x, mSecondCurveControlPoint1.y,
                mSecondCurveControlPoint2.x, mSecondCurveControlPoint2.y,
                mSecondCurveEndPoint.x, mSecondCurveEndPoint.y);

        mPath.lineTo(mNavigationBarWidth, 0);
        mPath.lineTo(mNavigationBarWidth, mNavigationBarHeight);
        mPath.lineTo(0, mNavigationBarHeight);
        mPath.close();
    }

    @Override
    protected void onDraw(Canvas canvas) {
        canvas.drawPath(mPath, mPaint);
        super.onDraw(canvas);
    }
}