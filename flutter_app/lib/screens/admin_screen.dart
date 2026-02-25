import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:provider/provider.dart';
import '../services/api_service.dart';

class AdminScreen extends StatefulWidget {
  const AdminScreen({super.key});
  @override
  State<AdminScreen> createState() => _AdminScreenState();
}

class _AdminScreenState extends State<AdminScreen>
    with SingleTickerProviderStateMixin {
  late TabController _tab;
  List _users = [], _keys = [], _servers = [], _proxies = [];
  Map<String, dynamic> _stats = {};
  bool _loading = true;

  @override
  void initState() {
    super.initState();
    _tab = TabController(length: 4, vsync: this);
    _loadAll();
  }

  @override
  void dispose() {
    _tab.dispose();
    super.dispose();
  }

  Future<void> _loadAll() async {
    setState(() => _loading = true);
    try {
      final api = context.read<ApiService>();
      final results = await Future.wait([
        api.getAdminUsers(),
        api.getAdminKeys(),
        api.getAdminServers(),
        api.getAdminProxies(),
        api.getAdminStats(),
      ]);
      if (!mounted) return;
      setState(() {
        _users = results[0] as List;
        _keys = results[1] as List;
        _servers = results[2] as List;
        _proxies = results[3] as List;
        _stats = results[4] as Map<String, dynamic>;
        _loading = false;
      });
    } catch (e) {
      if (!mounted) return;
      setState(() => _loading = false);
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('Error: $e'), backgroundColor: Colors.red),
        );
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    return Column(
      children: [
        // Stats row
        if (!_loading)
          Padding(
            padding: const EdgeInsets.fromLTRB(16, 8, 16, 0),
            child: Row(
              children: [
                _miniStat(
                    '👥', '${_stats['total_users'] ?? _users.length}', 'Users'),
                const SizedBox(width: 8),
                _miniStat(
                    '🔑', '${_stats['active_keys'] ?? _keys.length}', 'Keys'),
                const SizedBox(width: 8),
                _miniStat('🖥️', '${_servers.length}', 'Servers'),
                const SizedBox(width: 8),
                _miniStat('🔀', '${_stats['total_proxies'] ?? _proxies.length}',
                    'Proxies'),
              ],
            ),
          ),
        const SizedBox(height: 8),
        TabBar(
          controller: _tab,
          labelColor: const Color(0xFF3B82F6),
          unselectedLabelColor: const Color(0xFF64748B),
          indicatorColor: const Color(0xFF3B82F6),
          labelStyle:
              const TextStyle(fontSize: 13, fontWeight: FontWeight.w600),
          tabs: const [
            Tab(text: '👥 Users'),
            Tab(text: '🔑 Keys'),
            Tab(text: '🖥️ Servers'),
            Tab(text: '🔀 Proxies'),
          ],
        ),
        Expanded(
          child: _loading
              ? const Center(child: CircularProgressIndicator())
              : TabBarView(
                  controller: _tab,
                  children: [
                    _buildUsers(),
                    _buildKeys(),
                    _buildServers(),
                    _buildProxies(),
                  ],
                ),
        ),
      ],
    );
  }

  Widget _miniStat(String icon, String value, String label) {
    return Expanded(
      child: Container(
        padding: const EdgeInsets.all(10),
        decoration: BoxDecoration(
          color: const Color(0xFF111827),
          borderRadius: BorderRadius.circular(8),
          border: Border.all(color: const Color(0xFF1E293B)),
        ),
        child: Column(
          children: [
            Text(icon, style: const TextStyle(fontSize: 18)),
            Text(value,
                style:
                    const TextStyle(fontSize: 18, fontWeight: FontWeight.w700)),
            Text(label,
                style: TextStyle(fontSize: 10, color: Colors.grey[500])),
          ],
        ),
      ),
    );
  }

  // ===== USERS TAB =====
  Widget _buildUsers() {
    return RefreshIndicator(
      onRefresh: _loadAll,
      child: ListView.builder(
        padding: const EdgeInsets.all(12),
        itemCount: _users.length,
        itemBuilder: (ctx, i) {
          final u = _users[i];
          final isActive = u['is_active'] == 1 || u['is_active'] == true;
          return Card(
            margin: const EdgeInsets.only(bottom: 8),
            child: ListTile(
              leading: CircleAvatar(
                backgroundColor: u['role'] == 'admin'
                    ? const Color(0xFF8B5CF6)
                    : const Color(0xFF3B82F6),
                child: Text(
                  (u['username'] ?? '?')[0].toUpperCase(),
                  style: const TextStyle(
                      color: Colors.white, fontWeight: FontWeight.w700),
                ),
              ),
              title: Row(
                children: [
                  Text(u['username'] ?? '',
                      style: const TextStyle(fontWeight: FontWeight.w600)),
                  const SizedBox(width: 6),
                  Container(
                    padding:
                        const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                    decoration: BoxDecoration(
                      color: u['role'] == 'admin'
                          ? const Color(0xFF8B5CF6).withOpacity(0.2)
                          : const Color(0xFF3B82F6).withOpacity(0.2),
                      borderRadius: BorderRadius.circular(4),
                    ),
                    child: Text(u['role'] ?? 'user',
                        style: TextStyle(
                            fontSize: 11,
                            color: u['role'] == 'admin'
                                ? const Color(0xFF8B5CF6)
                                : const Color(0xFF3B82F6))),
                  ),
                ],
              ),
              subtitle: Text(
                'Servers: ${u['server_count'] ?? 0} | Key: ${u['active_key'] ?? 'none'}',
                style: TextStyle(fontSize: 12, color: Colors.grey[500]),
              ),
              trailing: Row(
                mainAxisSize: MainAxisSize.min,
                children: [
                  Icon(Icons.circle,
                      size: 10, color: isActive ? Colors.green : Colors.red),
                  const SizedBox(width: 8),
                  PopupMenuButton(
                    iconSize: 20,
                    itemBuilder: (_) => [
                      PopupMenuItem(
                        child: Text(isActive ? '🔒 Khóa' : '🔓 Mở khóa'),
                        onTap: () => _toggleUser(u['id']),
                      ),
                      if (u['role'] != 'admin')
                        PopupMenuItem(
                          child: const Text('👑 Set Admin'),
                          onTap: () => _changeRole(u['id'], 'admin'),
                        ),
                      if (u['role'] == 'admin')
                        PopupMenuItem(
                          child: const Text('👤 Set User'),
                          onTap: () => _changeRole(u['id'], 'user'),
                        ),
                    ],
                  ),
                ],
              ),
            ),
          );
        },
      ),
    );
  }

  // ===== KEYS TAB =====
  Widget _buildKeys() {
    return RefreshIndicator(
      onRefresh: _loadAll,
      child: Column(
        children: [
          // Create key button
          Padding(
            padding: const EdgeInsets.all(12),
            child: ElevatedButton.icon(
              onPressed: _showCreateKeyDialog,
              icon: const Icon(Icons.add, size: 18),
              label: const Text('Tạo Key Mới'),
              style: ElevatedButton.styleFrom(
                minimumSize: const Size(double.infinity, 44),
              ),
            ),
          ),
          Expanded(
            child: ListView.builder(
              padding: const EdgeInsets.symmetric(horizontal: 12),
              itemCount: _keys.length,
              itemBuilder: (ctx, i) {
                final k = _keys[i];
                final isActive = k['status'] == 'active';
                return Card(
                  margin: const EdgeInsets.only(bottom: 8),
                  child: Padding(
                    padding: const EdgeInsets.all(12),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Row(
                          children: [
                            Expanded(
                              child: GestureDetector(
                                onTap: () {
                                  Clipboard.setData(
                                      ClipboardData(text: k['key_code']));
                                  ScaffoldMessenger.of(context).showSnackBar(
                                    const SnackBar(
                                        content: Text('Đã copy key! 📋'),
                                        duration: Duration(seconds: 1)),
                                  );
                                },
                                child: Text(
                                  k['key_code'] ?? '',
                                  style: const TextStyle(
                                    fontFamily: 'monospace',
                                    fontSize: 13,
                                    fontWeight: FontWeight.w600,
                                    color: Color(0xFF10B981),
                                  ),
                                ),
                              ),
                            ),
                            Container(
                              padding: const EdgeInsets.symmetric(
                                  horizontal: 8, vertical: 3),
                              decoration: BoxDecoration(
                                color: isActive
                                    ? Colors.green.withOpacity(0.15)
                                    : Colors.red.withOpacity(0.15),
                                borderRadius: BorderRadius.circular(4),
                              ),
                              child: Text(
                                k['status'] ?? '',
                                style: TextStyle(
                                    fontSize: 11,
                                    fontWeight: FontWeight.w600,
                                    color:
                                        isActive ? Colors.green : Colors.red),
                              ),
                            ),
                          ],
                        ),
                        const SizedBox(height: 6),
                        Text(
                          'Max: ${k['max_servers']} servers, ${k['max_ports_per_server']} ports | User: ${k['username'] ?? 'chưa gán'}',
                          style:
                              TextStyle(fontSize: 11, color: Colors.grey[500]),
                        ),
                        const SizedBox(height: 8),
                        Row(
                          children: [
                            _smallBtn('✏️ Sửa', () => _showEditKeyDialog(k)),
                            const SizedBox(width: 8),
                            _smallBtn(
                              isActive ? '🚫 Thu hồi' : '✅ Kích hoạt',
                              () => _updateKeyStatus(k['id'], isActive),
                            ),
                            const SizedBox(width: 8),
                            _smallBtn('📋 Copy', () {
                              Clipboard.setData(
                                  ClipboardData(text: k['key_code']));
                              ScaffoldMessenger.of(context).showSnackBar(
                                const SnackBar(
                                    content: Text('Copied!'),
                                    duration: Duration(seconds: 1)),
                              );
                            }),
                          ],
                        ),
                      ],
                    ),
                  ),
                );
              },
            ),
          ),
        ],
      ),
    );
  }

  // ===== SERVERS TAB =====
  Widget _buildServers() {
    return RefreshIndicator(
      onRefresh: _loadAll,
      child: ListView.builder(
        padding: const EdgeInsets.all(12),
        itemCount: _servers.length,
        itemBuilder: (ctx, i) {
          final s = _servers[i];
          return Card(
            margin: const EdgeInsets.only(bottom: 8),
            child: ListTile(
              leading: const CircleAvatar(
                backgroundColor: Color(0xFF3B82F6),
                child: Icon(Icons.dns, color: Colors.white, size: 20),
              ),
              title: Text(s['name'] ?? '',
                  style: const TextStyle(fontWeight: FontWeight.w600)),
              subtitle: Text(
                'IP: ${s['target_ip']} | Owner: ${s['owner'] ?? '?'} | Ports: ${s['port_count'] ?? 0}',
                style: TextStyle(fontSize: 11, color: Colors.grey[500]),
              ),
              trailing: Container(
                padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
                decoration: BoxDecoration(
                  color: const Color(0xFF10B981).withOpacity(0.15),
                  borderRadius: BorderRadius.circular(4),
                ),
                child: Text(
                  s['key_code']?.toString().substring(0, 12) ?? '',
                  style: const TextStyle(
                      fontSize: 10,
                      color: Color(0xFF10B981),
                      fontFamily: 'monospace'),
                ),
              ),
            ),
          );
        },
      ),
    );
  }

  // ===== PROXIES TAB =====
  Widget _buildProxies() {
    return RefreshIndicator(
      onRefresh: _loadAll,
      child: ListView.builder(
        padding: const EdgeInsets.all(12),
        itemCount: _proxies.length,
        itemBuilder: (ctx, i) {
          final p = _proxies[i];
          final isOn = p['is_active'] == 1 || p['is_active'] == true;
          return Card(
            margin: const EdgeInsets.only(bottom: 8),
            child: Padding(
              padding: const EdgeInsets.all(12),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Row(
                    children: [
                      Icon(Icons.circle,
                          size: 10, color: isOn ? Colors.green : Colors.red),
                      const SizedBox(width: 6),
                      Expanded(
                        child: Text(
                          '${p['proxy_address']} → ${p['target_address']}',
                          style: const TextStyle(
                              fontSize: 13,
                              fontWeight: FontWeight.w600,
                              fontFamily: 'monospace'),
                        ),
                      ),
                    ],
                  ),
                  const SizedBox(height: 4),
                  Text(
                    'Server: ${p['server_name']} | Owner: ${p['owner'] ?? '?'} | ${p['protocol']?.toUpperCase() ?? 'TCP'}',
                    style: TextStyle(fontSize: 11, color: Colors.grey[500]),
                  ),
                ],
              ),
            ),
          );
        },
      ),
    );
  }

  // ===== HELPERS =====

  Widget _smallBtn(String text, VoidCallback onTap) {
    return InkWell(
      onTap: onTap,
      borderRadius: BorderRadius.circular(4),
      child: Container(
        padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
        decoration: BoxDecoration(
          border: Border.all(color: const Color(0xFF1E293B)),
          borderRadius: BorderRadius.circular(4),
        ),
        child: Text(text, style: const TextStyle(fontSize: 11)),
      ),
    );
  }

  Future<void> _toggleUser(int id) async {
    try {
      await context.read<ApiService>().toggleUser(id);
      _loadAll();
    } catch (_) {}
  }

  Future<void> _changeRole(int id, String role) async {
    try {
      await context.read<ApiService>().changeUserRole(id, role);
      _loadAll();
    } catch (_) {}
  }

  Future<void> _updateKeyStatus(int id, bool isActive) async {
    try {
      await context
          .read<ApiService>()
          .updateKey(id, {'status': isActive ? 'revoked' : 'active'});
      _loadAll();
    } catch (_) {}
  }

  void _showCreateKeyDialog() {
    final serversCtrl = TextEditingController(text: '1');
    final portsCtrl = TextEditingController(text: '3');
    final daysCtrl = TextEditingController(text: '30');
    showDialog(
      context: context,
      builder: (ctx) => AlertDialog(
        backgroundColor: const Color(0xFF111827),
        title: const Text('🔑 Tạo Key Mới'),
        content: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            _dialogField('Max Servers', serversCtrl),
            _dialogField('Max Ports/Server', portsCtrl),
            _dialogField('Hạn (ngày)', daysCtrl),
          ],
        ),
        actions: [
          TextButton(
              onPressed: () => Navigator.pop(ctx), child: const Text('Hủy')),
          ElevatedButton(
            onPressed: () async {
              Navigator.pop(ctx);
              try {
                final result = await context.read<ApiService>().createKey(
                      maxServers: int.parse(serversCtrl.text),
                      maxPorts: int.parse(portsCtrl.text),
                      days: int.parse(daysCtrl.text),
                    );
                if (mounted) {
                  ScaffoldMessenger.of(context).showSnackBar(
                    SnackBar(
                        content:
                            Text('Key tạo: ${result['key_code'] ?? 'OK'}')),
                  );
                }
                _loadAll();
              } catch (e) {
                if (mounted) {
                  ScaffoldMessenger.of(context).showSnackBar(
                    SnackBar(
                        content: Text('Lỗi: $e'), backgroundColor: Colors.red),
                  );
                }
              }
            },
            child: const Text('Tạo'),
          ),
        ],
      ),
    );
  }

  void _showEditKeyDialog(Map k) {
    final serversCtrl = TextEditingController(text: '${k['max_servers'] ?? 1}');
    final portsCtrl =
        TextEditingController(text: '${k['max_ports_per_server'] ?? 3}');
    final daysCtrl = TextEditingController(text: '0');
    final bwCtrl =
        TextEditingController(text: '${k['max_bandwidth_mbps'] ?? 100}');
    showDialog(
      context: context,
      builder: (ctx) => AlertDialog(
        backgroundColor: const Color(0xFF111827),
        title: Text('✏️ Sửa Key #${k['id']}'),
        content: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            _dialogField('Max Servers', serversCtrl),
            _dialogField('Max Ports/Server', portsCtrl),
            _dialogField('Gia hạn thêm (ngày)', daysCtrl),
            _dialogField('Bandwidth (Mbps)', bwCtrl),
          ],
        ),
        actions: [
          TextButton(
              onPressed: () => Navigator.pop(ctx), child: const Text('Hủy')),
          ElevatedButton(
            onPressed: () async {
              Navigator.pop(ctx);
              try {
                await context.read<ApiService>().updateKey(k['id'], {
                  'max_servers': int.parse(serversCtrl.text),
                  'max_ports_per_server': int.parse(portsCtrl.text),
                  'extends_days': int.parse(daysCtrl.text),
                  'max_bandwidth_mbps': int.parse(bwCtrl.text),
                });
                if (mounted) {
                  ScaffoldMessenger.of(context).showSnackBar(
                    const SnackBar(content: Text('Đã cập nhật key! ✅')),
                  );
                }
                _loadAll();
              } catch (e) {
                if (mounted) {
                  ScaffoldMessenger.of(context).showSnackBar(
                    SnackBar(
                        content: Text('Lỗi: $e'), backgroundColor: Colors.red),
                  );
                }
              }
            },
            child: const Text('Lưu'),
          ),
        ],
      ),
    );
  }

  Widget _dialogField(String label, TextEditingController ctrl) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 12),
      child: TextField(
        controller: ctrl,
        keyboardType: TextInputType.number,
        decoration: InputDecoration(
          labelText: label,
          isDense: true,
          contentPadding:
              const EdgeInsets.symmetric(horizontal: 12, vertical: 10),
        ),
      ),
    );
  }
}
