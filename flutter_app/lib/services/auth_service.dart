import 'package:flutter/material.dart';
import 'package:shared_preferences/shared_preferences.dart';

class AuthService extends ChangeNotifier {
  String? _token;
  String? _username;
  String? _role;
  bool _isLoggedIn = false;

  bool get isLoggedIn => _isLoggedIn;
  String? get token => _token;
  String? get username => _username;
  String? get role => _role;
  bool get isAdmin => _role == 'admin';

  AuthService() {
    _loadFromPrefs();
  }

  Future<void> _loadFromPrefs() async {
    final prefs = await SharedPreferences.getInstance();
    _token = prefs.getString('token');
    _username = prefs.getString('username');
    _role = prefs.getString('role');
    _isLoggedIn = _token != null;
    notifyListeners();
  }

  Future<void> login(String token, String username, String role) async {
    _token = token;
    _username = username;
    _role = role;
    _isLoggedIn = true;

    final prefs = await SharedPreferences.getInstance();
    await prefs.setString('token', token);
    await prefs.setString('username', username);
    await prefs.setString('role', role);
    notifyListeners();
  }

  Future<void> logout() async {
    _token = null;
    _username = null;
    _role = null;
    _isLoggedIn = false;

    final prefs = await SharedPreferences.getInstance();
    await prefs.clear();
    notifyListeners();
  }
}
