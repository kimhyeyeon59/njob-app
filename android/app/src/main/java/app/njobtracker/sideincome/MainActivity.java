package app.njobtracker.sideincome;

import android.os.Bundle;
import android.webkit.WebView;
import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {
    @Override
    public void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        
        // WebView 설정 강화
        WebView webView = getBridge().getWebView();
        if (webView != null) {
            webView.getSettings().setDomStorageEnabled(true);
            webView.getSettings().setDatabaseEnabled(true);
            webView.getSettings().setJavaScriptEnabled(true);
            
            // 한글 입력 개선 (하드웨어 가속)
            webView.setLayerType(WebView.LAYER_TYPE_HARDWARE, null);
        }
    }
}