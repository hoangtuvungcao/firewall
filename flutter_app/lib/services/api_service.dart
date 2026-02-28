import 'dart:convert';
import 'package:http/http.dart' as http;

class ApiService {
  // Change this to your VPS IP
  static const String baseUrl = 'https://firewall.bacsycay.click';
  String? _token;

  void setToken(String token) => _token = token;
  void clearToken() => _token = null;

  Map<String, String> get _headers => {
        'Content-Type': 'application/json',
        if (_token != null) 'Authorization': 'Bearer $_token',
      };

  dynamic _process(http.Response res) {
    dynamic data;
    try {
      data = jsonDecode(res.body);
    } catch (e) {
      if (res.statusCode >= 200 && res.statusCode < 300) return null;
      throw Exception('Error ${res.statusCode}: ${res.body}');
    }

    if (res.statusCode >= 200 && res.statusCode < 300) {
      return data;
    }

    final msg = data is Map && data['error'] != null
        ? data['error']
        : 'Failed with status ${res.statusCode}';
    throw Exception(msg);
  }

  Future<Map<String, dynamic>> login(String username, String password) async {
    final res = await http.post(
      Uri.parse('$baseUrl/api/auth/login'),
      headers: _headers,
      body: jsonEncode({'username': username, 'password': password}),
    );
    final data = _process(res);
    _token = data['token'];
    return data as Map<String, dynamic>;
  }

  Future<Map<String, dynamic>> register(
    String username,
    String password,
    String keyCode,
  ) async {
    final res = await http.post(
      Uri.parse('$baseUrl/api/auth/register'),
      headers: _headers,
      body: jsonEncode({
        'username': username,
        'password': password,
        'key_code': keyCode,
      }),
    );
    final data = _process(res);
    _token = data['token'];
    return data as Map<String, dynamic>;
  }

  Future<Map<String, dynamic>> getSummary() async {
    final res = await http.get(Uri.parse('$baseUrl/api/stats/summary'),
        headers: _headers);
    return _process(res) as Map<String, dynamic>;
  }

  Future<List> getServers() async {
    final res =
        await http.get(Uri.parse('$baseUrl/api/servers'), headers: _headers);
    return _process(res) as List;
  }

  Future<Map<String, dynamic>> addServer(String name, String ip) async {
    final res = await http.post(
      Uri.parse('$baseUrl/api/servers'),
      headers: _headers,
      body: jsonEncode({'name': name, 'target_ip': ip}),
    );
    return _process(res) as Map<String, dynamic>;
  }

  Future<List> getProxies() async {
    final res =
        await http.get(Uri.parse('$baseUrl/api/proxy'), headers: _headers);
    return _process(res) as List;
  }

  Future<Map<String, dynamic>> createProxy(
    int serverId,
    int targetPort, {
    String protocol = 'tcp',
  }) async {
    final res = await http.post(
      Uri.parse('$baseUrl/api/proxy/create'),
      headers: _headers,
      body: jsonEncode({
        'server_id': serverId,
        'target_port': targetPort,
        'protocol': protocol,
      }),
    );
    return _process(res) as Map<String, dynamic>;
  }

  Future<void> toggleProxy(int id) async {
    final res = await http.put(Uri.parse('$baseUrl/api/proxy/$id/toggle'),
        headers: _headers);
    _process(res);
  }

  Future<void> deleteProxy(int id) async {
    final res = await http.delete(Uri.parse('$baseUrl/api/proxy/$id'),
        headers: _headers);
    _process(res);
  }

  Future<List> getAttacks({int limit = 20}) async {
    final res = await http.get(
        Uri.parse('$baseUrl/api/stats/attacks?limit=$limit'),
        headers: _headers);
    return _process(res) as List;
  }

  Future<void> deleteServer(int id) async {
    final res = await http.delete(Uri.parse('$baseUrl/api/servers/$id'),
        headers: _headers);
    _process(res);
  }

  // === ADMIN APIs ===

  Future<Map<String, dynamic>> getAdminStats() async {
    final res = await http.get(Uri.parse('$baseUrl/api/admin/stats'),
        headers: _headers);
    return _process(res) as Map<String, dynamic>;
  }

  Future<List> getAdminUsers() async {
    final res = await http.get(Uri.parse('$baseUrl/api/admin/users'),
        headers: _headers);
    return _process(res) as List;
  }

  Future<List> getAdminKeys() async {
    final res =
        await http.get(Uri.parse('$baseUrl/api/keys'), headers: _headers);
    return _process(res) as List;
  }

  Future<List> getAdminServers() async {
    final res = await http.get(Uri.parse('$baseUrl/api/admin/servers'),
        headers: _headers);
    return _process(res) as List;
  }

  Future<List> getAdminProxies() async {
    final res = await http.get(Uri.parse('$baseUrl/api/admin/proxies'),
        headers: _headers);
    return _process(res) as List;
  }

  Future<Map<String, dynamic>> createKey({
    int maxServers = 1,
    int maxPorts = 3,
    int days = 30,
    int bandwidth = 100,
  }) async {
    final res = await http.post(
      Uri.parse('$baseUrl/api/keys'),
      headers: _headers,
      body: jsonEncode({
        'max_servers': maxServers,
        'max_ports_per_server': maxPorts,
        'expires_days': days,
        'max_bandwidth_mbps': bandwidth,
      }),
    );
    return _process(res) as Map<String, dynamic>;
  }

  Future<void> updateKey(int id, Map<String, dynamic> updates) async {
    final res = await http.put(
      Uri.parse('$baseUrl/api/keys/$id'),
      headers: _headers,
      body: jsonEncode(updates),
    );
    _process(res);
  }

  Future<void> toggleUser(int id) async {
    final res = await http.put(Uri.parse('$baseUrl/api/admin/users/$id/toggle'),
        headers: _headers);
    _process(res);
  }

  Future<void> changeUserRole(int id, String role) async {
    final res = await http.put(
      Uri.parse('$baseUrl/api/admin/users/$id/role'),
      headers: _headers,
      body: jsonEncode({'role': role}),
    );
    _process(res);
  }
}
