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

  Future<Map<String, dynamic>> login(String username, String password) async {
    final res = await http.post(
      Uri.parse('$baseUrl/api/auth/login'),
      headers: _headers,
      body: jsonEncode({'username': username, 'password': password}),
    );
    final data = jsonDecode(res.body);
    if (res.statusCode != 200) throw Exception(data['error'] ?? 'Login failed');
    _token = data['token'];
    return data;
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
    final data = jsonDecode(res.body);
    if (res.statusCode != 200 && res.statusCode != 201) {
      throw Exception(data['error'] ?? 'Register failed');
    }
    _token = data['token'];
    return data;
  }

  Future<Map<String, dynamic>> getSummary() async {
    final res = await http.get(
      Uri.parse('$baseUrl/api/stats/summary'),
      headers: _headers,
    );
    return jsonDecode(res.body);
  }

  Future<List> getServers() async {
    final res = await http.get(
      Uri.parse('$baseUrl/api/servers'),
      headers: _headers,
    );
    return jsonDecode(res.body);
  }

  Future<Map<String, dynamic>> addServer(String name, String ip) async {
    final res = await http.post(
      Uri.parse('$baseUrl/api/servers'),
      headers: _headers,
      body: jsonEncode({'name': name, 'target_ip': ip}),
    );
    final data = jsonDecode(res.body);
    if (res.statusCode != 200 && res.statusCode != 201) {
      throw Exception(data['error'] ?? 'Failed');
    }
    return data;
  }

  Future<List> getProxies() async {
    final res = await http.get(
      Uri.parse('$baseUrl/api/proxy'),
      headers: _headers,
    );
    return jsonDecode(res.body);
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
    final data = jsonDecode(res.body);
    if (res.statusCode != 200 && res.statusCode != 201) {
      throw Exception(data['error'] ?? 'Failed');
    }
    return data;
  }

  Future<void> toggleProxy(int id) async {
    await http.put(
      Uri.parse('$baseUrl/api/proxy/$id/toggle'),
      headers: _headers,
    );
  }

  Future<void> deleteProxy(int id) async {
    await http.delete(Uri.parse('$baseUrl/api/proxy/$id'), headers: _headers);
  }

  Future<List> getAttacks({int limit = 20}) async {
    final res = await http.get(
      Uri.parse('$baseUrl/api/stats/attacks?limit=$limit'),
      headers: _headers,
    );
    return jsonDecode(res.body);
  }

  Future<void> deleteServer(int id) async {
    await http.delete(Uri.parse('$baseUrl/api/servers/$id'), headers: _headers);
  }

  // === ADMIN APIs ===

  Future<Map<String, dynamic>> getAdminStats() async {
    final res = await http.get(
      Uri.parse('$baseUrl/api/admin/stats'),
      headers: _headers,
    );
    return jsonDecode(res.body);
  }

  Future<List> getAdminUsers() async {
    final res = await http.get(
      Uri.parse('$baseUrl/api/admin/users'),
      headers: _headers,
    );
    return jsonDecode(res.body);
  }

  Future<List> getAdminKeys() async {
    final res = await http.get(
      Uri.parse('$baseUrl/api/keys'),
      headers: _headers,
    );
    return jsonDecode(res.body);
  }

  Future<List> getAdminServers() async {
    final res = await http.get(
      Uri.parse('$baseUrl/api/admin/servers'),
      headers: _headers,
    );
    return jsonDecode(res.body);
  }

  Future<List> getAdminProxies() async {
    final res = await http.get(
      Uri.parse('$baseUrl/api/admin/proxies'),
      headers: _headers,
    );
    return jsonDecode(res.body);
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
    final data = jsonDecode(res.body);
    if (res.statusCode != 200 && res.statusCode != 201) {
      throw Exception(data['error'] ?? 'Failed');
    }
    return data;
  }

  Future<void> updateKey(int id, Map<String, dynamic> updates) async {
    final res = await http.put(
      Uri.parse('$baseUrl/api/keys/$id'),
      headers: _headers,
      body: jsonEncode(updates),
    );
    if (res.statusCode != 200) {
      throw Exception(jsonDecode(res.body)['error'] ?? 'Failed');
    }
  }

  Future<void> toggleUser(int id) async {
    await http.put(
      Uri.parse('$baseUrl/api/admin/users/$id/toggle'),
      headers: _headers,
    );
  }

  Future<void> changeUserRole(int id, String role) async {
    await http.put(
      Uri.parse('$baseUrl/api/admin/users/$id/role'),
      headers: _headers,
      body: jsonEncode({'role': role}),
    );
  }
}
