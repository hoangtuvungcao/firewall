#include <linux/bpf.h>
#include <linux/if_ether.h>
#include <linux/ip.h>
#include <linux/udp.h>
#include <bpf/bpf_helpers.h>
#include <linux/in.h>

/* SA:MP Game Port */
#define GAME_PORT 7777

/* BPF Map cho Blacklist (IP bị AI chặn) */
struct {
    __uint(type, BPF_MAP_TYPE_HASH);
    __uint(max_entries, 131072);
    __type(key, __u32);   // IPv4 Address
    __type(value, __u8);  // Dummy
} blacklist_map SEC(".maps");

/* BPF Map cho Whitelist (IP người chơi ổn định/Admin) */
struct {
    __uint(type, BPF_MAP_TYPE_HASH);
    __uint(max_entries, 65536);
    __type(key, __u32);
    __type(value, __u8);
} whitelist_map SEC(".maps");

SEC("xdp_samp")
int xdp_samp_filter(struct xdp_md *ctx) {
    void *data_end = (void *)(long)ctx->data_end;
    void *data = (void *)(long)ctx->data;

    struct ethhdr *eth = data;
    if ((void *)(eth + 1) > data_end) return XDP_PASS;

    if (eth->h_proto != __constant_htons(ETH_P_IP)) return XDP_PASS;

    struct iphdr *iph = (void *)(eth + 1);
    if ((void *)(iph + 1) > data_end) return XDP_PASS;

    __u32 src_ip = iph->saddr;

    /* 1. Kiểm tra Whitelist (Ưu tiên cao nhất) */
    if (bpf_map_lookup_elem(&whitelist_map, &src_ip)) {
        return XDP_PASS;
    }

    /* 2. Kiểm tra Blacklist */
    if (bpf_map_lookup_elem(&blacklist_map, &src_ip)) {
        return XDP_DROP;
    }

    if (iph->protocol != IPPROTO_UDP) return XDP_PASS;

    struct udphdr *udp = (void *)(iph + 1);
    if ((void *)(udp + 1) > data_end) return XDP_PASS;

    if (udp->dest != __constant_htons(GAME_PORT)) return XDP_PASS;

    /* 3. Deep Packet Inspection (SAMP/RakNet) */
    __u16 len = __constant_ntohs(udp->len) - sizeof(struct udphdr);
    
    // Chặn tức thì gói UDP bất thường (Quá lớn hoặc quá nhỏ cho Game Port)
    if (len < 3 || len > 1460) return XDP_DROP;

    unsigned char *payload = (unsigned char *)(udp + 1);
    if ((void *)(payload + 1) > data_end) return XDP_DROP;

    unsigned char header = *payload;

    // RakNet Valid Headers for SAMP:
    // 0x05 (Req1), 0x07 (Req2), 0x09 (ConnReq), 0x34 (RPC), 0x54 (Sync), 0x53 (SAMP Query)
    if (len > 50) {
        if (header != 0x05 && header != 0x07 && header != 0x09 && 
            header != 0x34 && header != 0x54 && header != 0x56 &&
            header != 0x53) {
            return XDP_DROP; // Chặn "UDP Junk" không khớp Protocol RakNet
        }
    }

    return XDP_PASS;
}

char _license[] SEC("license") = "GPL";
