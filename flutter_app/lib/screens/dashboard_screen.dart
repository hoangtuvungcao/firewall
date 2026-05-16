import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../services/api_service.dart';
import '../services/auth_service.dart';
import 'servers_screen.dart';
import 'proxies_screen.dart';
import 'admin_screen.dart';
import 'notifications_screen.dart';
import 'firewall_screen.dart';
import 'attacks_screen.dart';

class DashboardScreen extends StatefulWidget {
  const DashboardScreen({super.key});
  @override
  State<DashboardScreen> createState() => _DashboardScreenState();
}

class _DashboardScreenState extends State<DashboardScreen> {
  int _currentIndex = 0;
  Map<String, dynamic> _summary = {};
  bool _loading = true;
  int _unreadNotifications = 0;

  @override
  void initState() {
    super.initState();
    _loadData();
  }

  Future<void> _loadData() async {
    try {
      final api = context.read<ApiService>();
      api.setToken(context.read<AuthService>().token!);
      final results = await Future.wait([
        api.getSummary(),
        api.getNotificationCount(),
      ]);
      if (!mounted) return;
      setState(() {
        _summary = results[0] as Map<String, dynamic>;
        final countData = results[1] as Map<String, dynamic>;
        _unreadNotifications = countData['count'] ?? 0;
        _loading = false;
      });
    } catch (e) {
      if (!mounted) return;
      setState(() => _loading = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final auth = context.watch<AuthService>();
    final isAdmin = auth.isAdmin;

    final screens = <Widget>[
      _buildOverview(),
      const ServersScreen(),
      const ProxiesScreen(),
      const FirewallScreen(),
      if (isAdmin) const AdminScreen(),
    ];

    if (_currentIndex >= screens.length) _currentIndex = 0;

    return Scaffold(
      appBar: AppBar(
        backgroundColor: const Color(0xFF0F1520),
        elevation: 0,
        title: Row(
          children: [
            Container(
              width: 32, height: 32,
              decoration: BoxDecoration(
                gradient: const LinearGradient(colors: [Color(0xFF3B82F6), Color(0xFF8B5CF6)]),
                borderRadius: BorderRadius.circular(8),
              ),
              child: const Icon(Icons.shield, size: 18, color: Colors.white),
            ),
            const SizedBox(width: 10),
            ShaderMask(
              shaderCallback: (b) => const LinearGradient(
                colors: [Color(0xFF3B82F6), Color(0xFF8B5CF6)],
              ).createShader(b),
              child: const Text('NRO Shield',
                  style: TextStyle(fontWeight: FontWeight.w700, fontSize: 18, color: Colors.white)),
            ),
            const SizedBox(width: 8),
            Container(
              padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
              decoration: BoxDecoration(
                color: const Color(0xFF10B981).withOpacity(0.2),
                borderRadius: BorderRadius.circular(4),
              ),
              child: const Text('v2.0',
                  style: TextStyle(fontSize: 10, color: Color(0xFF10B981), fontWeight: FontWeight.w600)),
            ),
          ],
        ),
        actions: [
          Stack(
            children: [
              IconButton(
                icon: const Icon(Icons.notifications_outlined, size: 22),
                onPressed: () => Navigator.push(context,
                    MaterialPageRoute(builder: (_) => const NotificationsScreen())),
              ),
              if (_unreadNotifications > 0)
                Positioned(
                  right: 8, top: 8,
                  child: Container(
                    padding: const EdgeInsets.all(4),
                    decoration: const BoxDecoration(color: Color(0xFFEF4444), shape: BoxShape.circle),
                    constraints: const BoxConstraints(minWidth: 16, minHeight: 16),
                    child: Text('$_unreadNotifications',
                        style: const TextStyle(fontSize: 10, color: Colors.white),
                        textAlign: TextAlign.center),
                  ),
                ),
            ],
          ),
          PopupMenuButton(
            icon: CircleAvatar(
              radius: 16,
              backgroundColor: isAdmin ? const Color(0xFF8B5CF6) : const Color(0xFF3B82F6),
              child: Text((auth.username ?? '?')[0].toUpperCase(),
                  style: const TextStyle(color: Colors.white, fontWeight: FontWeight.w700, fontSize: 14)),
            ),
            itemBuilder: (_) => [
              PopupMenuItem(
                enabled: false,
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(auth.username ?? '', style: const TextStyle(fontWeight: FontWeight.w600, color: Colors.white)),
                    const SizedBox(height: 2),
                    Row(children: [
                      Container(
                        padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 1),
                        decoration: BoxDecoration(
                          color: _roleColor(auth.role).withOpacity(0.2),
                          borderRadius: BorderRadius.circular(3),
                        ),
                        child: Text((auth.role ?? 'user').toUpperCase(),
                            style: TextStyle(fontSize: 10, color: _roleColor(auth.role), fontWeight: FontWeight.w700)),
                      ),
                      if (auth.planName != null) ...[
                        const SizedBox(width: 6),
                        Text(auth.planName!, style: TextStyle(fontSize: 11, color: Colors.grey[500])),
                      ],
                    ]),
                  ],
                ),
              ),
              const PopupMenuDivider(),
              PopupMenuItem(
                child: const Row(children: [
                  Icon(Icons.history, size: 18), SizedBox(width: 8), Text('Lich su tan cong'),
                ]),
                onTap: () => Future.delayed(Duration.zero, () {
                  if (!mounted) return;
                  Navigator.push(context, MaterialPageRoute(builder: (_) => const AttacksScreen()));
                }),
              ),
              PopupMenuItem(
                child: const Row(children: [
                  Icon(Icons.logout, size: 18, color: Color(0xFFEF4444)),
                  SizedBox(width: 8),
                  Text('Dang xuat', style: TextStyle(color: Color(0xFFEF4444))),
                ]),
                onTap: () => auth.logout(),
              ),
            ],
          ),
          const SizedBox(width: 4),
        ],
      ),
      body: screens[_currentIndex],
      bottomNavigationBar: Container(
        decoration: const BoxDecoration(
          border: Border(top: BorderSide(color: Color(0xFF1E293B), width: 1)),
        ),
        child: BottomNavigationBar(
          currentIndex: _currentIndex,
          onTap: (i) => setState(() => _currentIndex = i),
          backgroundColor: const Color(0xFF0F1520),
          selectedItemColor: const Color(0xFF3B82F6),
          unselectedItemColor: const Color(0xFF64748B),
          type: BottomNavigationBarType.fixed,
          selectedFontSize: 11,
          unselectedFontSize: 11,
          items: [
            const BottomNavigationBarItem(icon: Icon(Icons.dashboard_outlined), activeIcon: Icon(Icons.dashboard), label: 'Tong quan'),
            const BottomNavigationBarItem(icon: Icon(Icons.dns_outlined), activeIcon: Icon(Icons.dns), label: 'Servers'),
            const BottomNavigationBarItem(icon: Icon(Icons.swap_horiz_outlined), activeIcon: Icon(Icons.swap_horiz), label: 'Proxy'),
            const BottomNavigationBarItem(icon: Icon(Icons.security_outlined), activeIcon: Icon(Icons.security), label: 'Firewall'),
            if (isAdmin)
              const BottomNavigationBarItem(icon: Icon(Icons.admin_panel_settings_outlined), activeIcon: Icon(Icons.admin_panel_settings), label: 'Admin'),
          ],
        ),
      ),
    );
  }

  Color _roleColor(String? role) {
    switch (role) {
      case 'admin': return const Color(0xFF8B5CF6);
      case 'reseller': return const Color(0xFFF59E0B);
      case 'premium': return const Color(0xFF10B981);
      default: return const Color(0xFF3B82F6);
    }
  }

  Widget _buildOverview() {
    if (_loading) return const Center(child: CircularProgressIndicator());
    return RefreshIndicator(
      onRefresh: _loadData,
      child: ListView(
        padding: const EdgeInsets.all(16),
        children: [
          Row(children: [
            _statCard(Icons.dns, '${_summary['total_servers'] ?? 0}', 'Servers', const Color(0xFF3B82F6)),
            const SizedBox(width: 12),
            _statCard(Icons.swap_horiz, '${_summary['active_ports'] ?? 0}/${_summary['total_ports'] ?? 0}', 'Ports', const Color(0xFF10B981)),
          ]),
          const SizedBox(height: 12),
          Row(children: [
            _statCard(Icons.warning_amber, '${_summary['attacks_today'] ?? 0}', 'Tan cong hom nay', const Color(0xFFEF4444)),
            const SizedBox(width: 12),
            _statCard(Icons.smart_toy, 'Active', 'AI Engine', const Color(0xFF8B5CF6)),
          ]),
          const SizedBox(height: 20),
          Card(
            child: Padding(
              padding: const EdgeInsets.all(16),
              child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                const Row(children: [
                  Icon(Icons.flash_on, color: Color(0xFFF59E0B), size: 20),
                  SizedBox(width: 8),
                  Text('Thao tac nhanh', style: TextStyle(fontSize: 16, fontWeight: FontWeight.w600)),
                ]),
                const SizedBox(height: 14),
                Row(children: [
                  Expanded(child: _actionBtn(Icons.add, 'Them Server', const Color(0xFF3B82F6), () => setState(() => _currentIndex = 1))),
                  const SizedBox(width: 10),
                  Expanded(child: _actionBtn(Icons.swap_horiz, 'Tao Proxy', const Color(0xFF10B981), () => setState(() => _currentIndex = 2))),
                ]),
                const SizedBox(height: 10),
                Row(children: [
                  Expanded(child: _actionBtn(Icons.history, 'Tan cong', const Color(0xFFEF4444), () =>
                      Navigator.push(context, MaterialPageRoute(builder: (_) => const AttacksScreen())))),
                  const SizedBox(width: 10),
                  Expanded(child: _actionBtn(Icons.security, 'Firewall', const Color(0xFF8B5CF6), () => setState(() => _currentIndex = 3))),
                ]),
              ]),
            ),
          ),
          const SizedBox(height: 16),
          Card(
            child: Padding(
              padding: const EdgeInsets.all(16),
              child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                const Row(children: [
                  Icon(Icons.info_outline, color: Color(0xFF3B82F6), size: 20),
                  SizedBox(width: 8),
                  Text('Huong dan su dung', style: TextStyle(fontSize: 16, fontWeight: FontWeight.w600)),
                ]),
                const SizedBox(height: 12),
                _stepRow(1, 'Them server game (nhap IP that)', Icons.dns),
                _stepRow(2, 'Chon loai game phu hop', Icons.sports_esports),
                _stepRow(3, 'Tao proxy port -> nhan IP Shield', Icons.swap_horiz),
                _stepRow(4, 'Dung IP Shield de ket noi game', Icons.link),
                _stepRow(5, 'AI tu bao ve khoi DDoS', Icons.smart_toy),
              ]),
            ),
          ),
        ],
      ),
    );
  }

  Widget _statCard(IconData icon, String value, String label, Color color) {
    return Expanded(
      child: Card(
        child: Padding(
          padding: const EdgeInsets.all(16),
          child: Row(children: [
            Container(
              width: 44, height: 44,
              decoration: BoxDecoration(color: color.withOpacity(0.15), borderRadius: BorderRadius.circular(10)),
              child: Icon(icon, color: color, size: 22),
            ),
            const SizedBox(width: 12),
            Expanded(child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
              Text(value, style: const TextStyle(fontSize: 20, fontWeight: FontWeight.w700), overflow: TextOverflow.ellipsis),
              Text(label, style: TextStyle(fontSize: 11, color: Colors.grey[500]), overflow: TextOverflow.ellipsis),
            ])),
          ]),
        ),
      ),
    );
  }

  Widget _actionBtn(IconData icon, String label, Color color, VoidCallback onTap) {
    return Material(
      color: color.withOpacity(0.1),
      borderRadius: BorderRadius.circular(10),
      child: InkWell(
        onTap: onTap,
        borderRadius: BorderRadius.circular(10),
        child: Padding(
          padding: const EdgeInsets.symmetric(vertical: 14),
          child: Column(children: [
            Icon(icon, color: color, size: 22),
            const SizedBox(height: 6),
            Text(label, style: TextStyle(fontSize: 12, color: color, fontWeight: FontWeight.w600)),
          ]),
        ),
      ),
    );
  }

  Widget _stepRow(int step, String text, IconData icon) {
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 6),
      child: Row(children: [
        Container(
          width: 28, height: 28,
          decoration: BoxDecoration(color: const Color(0xFF3B82F6).withOpacity(0.15), borderRadius: BorderRadius.circular(7)),
          child: Center(child: Text('$step', style: const TextStyle(fontSize: 13, color: Color(0xFF3B82F6), fontWeight: FontWeight.w700))),
        ),
        const SizedBox(width: 12),
        Icon(icon, size: 16, color: Colors.grey[600]),
        const SizedBox(width: 8),
        Expanded(child: Text(text, style: TextStyle(color: Colors.grey[400], fontSize: 13))),
      ]),
    );
  }
}
