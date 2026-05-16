import 'dart:async';
import 'dart:convert';
import 'package:flutter/material.dart';
import 'package:web_socket_channel/web_socket_channel.dart';

class WebSocketService extends ChangeNotifier {
  WebSocketChannel? _channel;
  bool _connected = false;
  Timer? _reconnectTimer;
  Timer? _pingTimer;
  final List<Map<String, dynamic>> _realtimeAttacks = [];
  Map<String, dynamic> _liveMetrics = {};

  bool get connected => _connected;
  List<Map<String, dynamic>> get realtimeAttacks =>
      List.unmodifiable(_realtimeAttacks);
  Map<String, dynamic> get liveMetrics => Map.unmodifiable(_liveMetrics);

  void connect(String baseUrl, String token) {
    final wsUrl = baseUrl
        .replaceFirst('https://', 'wss://')
        .replaceFirst('http://', 'ws://');
    try {
      _channel = WebSocketChannel.connect(Uri.parse(wsUrl));
      _connected = true;
      notifyListeners();

      _channel!.stream.listen(
        (data) => _handleMessage(data),
        onError: (_) => _onDisconnect(),
        onDone: () => _onDisconnect(),
      );

      _channel!.sink.add(jsonEncode({'type': 'auth', 'token': token}));

      _pingTimer?.cancel();
      _pingTimer = Timer.periodic(
          const Duration(seconds: 30),
          (_) => _channel?.sink
              .add(jsonEncode({'type': 'ping', 't': DateTime.now().millisecondsSinceEpoch})));
    } catch (_) {
      _onDisconnect();
    }
  }

  void _handleMessage(dynamic raw) {
    try {
      final data = jsonDecode(raw as String) as Map<String, dynamic>;
      final type = data['type'] as String?;

      switch (type) {
        case 'attack_alert':
          _realtimeAttacks.insert(0, data);
          if (_realtimeAttacks.length > 100) _realtimeAttacks.removeLast();
          break;
        case 'metrics':
          _liveMetrics = data;
          break;
        case 'rule_update':
        case 'sync_complete':
          break;
      }
      notifyListeners();
    } catch (_) {}
  }

  void _onDisconnect() {
    _connected = false;
    notifyListeners();
    _reconnectTimer?.cancel();
    _reconnectTimer = Timer(const Duration(seconds: 5), () {});
  }

  void disconnect() {
    _reconnectTimer?.cancel();
    _pingTimer?.cancel();
    _channel?.sink.close();
    _connected = false;
    notifyListeners();
  }

  @override
  void dispose() {
    disconnect();
    super.dispose();
  }
}
