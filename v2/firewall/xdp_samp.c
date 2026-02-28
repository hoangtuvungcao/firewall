#include <linux/bpf.h>
#include <linux/if_ether.h>
#include <linux/ip.h>
#include <linux/udp.h>
#include <bpf/bpf_helpers.h>
#include <linux/in.h>

/* SA:MP Game Port */
#define GAME_PORT 7777

/* BPF Map để lưu trữ danh sách IP bị chặn bởi AI (Blacklist) */
struct {
    __uint(type, BPF_MAP_TYPE_HASH);
    __uint(max_entries, 131072);
    __type(key, __u32);   // IPv4 Address
    __type(value, __u8);  // Dummy value
} blacklist_map SEC(".maps");

SEC("xdp_samp")
int xdp_samp_filter(struct xdp_md *ctx) {
    void *data_end = (void *)(long)ctx->data_end;
    void *data = (void *)(long)ctx->data;

    struct ethhdr *eth = data;
    if ((void *)(eth + 1) > data_end)
        return XDP_PASS;

    if (eth->h_proto != __constant_htons(ETH_P_IP))
        return XDP_PASS;

    struct iphdr *iph = (void *)(eth + 1);
    if ((void *)(iph + 1) > data_end)
        return XDP_PASS;

    /* 1. Kiểm tra IP trong Blacklist Map (Được đẩy từ AI/Intel) */
    __u32 src_ip = iph->saddr;
    __u8 *blocked = bpf_map_lookup_elem(&blacklist_map, &src_ip);
    if (blocked) {
        return XDP_DROP;
    }

    if (iph->protocol != IPPROTO_UDP)
        return XDP_PASS;

    struct udphdr *udp = (void *)(iph + 1);
    if ((void *)(udp + 1) > data_end)
        return XDP_PASS;

    if (udp->dest != __constant_htons(GAME_PORT))
        return XDP_PASS;

    /* 2. RakNet Signature Hardening */
    __u16 len = __constant_ntohs(udp->len) - sizeof(struct udphdr);
    
    // Chặn tức thì các gói UDP quá nhỏ hoặc Malformed rác
    if (len < 5 || len > 1460) {
        return XDP_DROP;
    }

    // Nhận diện Header RakNet (Ví dụ: ID_OPEN_CONNECTION_REQUEST_1 là 0x05)
    // Cần offset offset chính xác để kiểm tra data byte đầu tiên
    unsigned char *payload = (unsigned char *)(udp + 1);
    if ((void *)(payload + 1) <= data_end) {
        unsigned char header = *payload;
        // Nếu là gói tin > 500 bytes nhưng không phải Handshake (0x05) hoặc Data (0x5E...) -> DROP
        if (len > 500 && header != 0x05 && header != 0x06 && header != 0x07 && header != 0x08) {
            // return XDP_DROP; // Có thể bật sau khi test kỹ
        }
    }

    return XDP_PASS;
}

char _license[] SEC("license") = "GPL";
