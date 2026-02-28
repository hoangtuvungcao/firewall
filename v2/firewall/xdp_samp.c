#include <linux/bpf.h>
#include <linux/if_ether.h>
#include <linux/ip.h>
#include <linux/udp.h>
#include <bpf/bpf_helpers.h>

/* SA:MP Game Port */
#define GAME_PORT 7777

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

    if (iph->protocol != IPPROTO_UDP)
        return XDP_PASS;

    struct udphdr *udp = (void *)(iph + 1);
    if ((void *)(udp + 1) > data_end)
        return XDP_PASS;

    /* Chỉ xử lý port game */
    if (udp->dest != __constant_htons(GAME_PORT))
        return XDP_PASS;

    /* 1. Chặn gói tin UDP có kích thước bất thường (Malformed/Attack) */
    __u16 len = __constant_ntohs(udp->len) - sizeof(struct udphdr);
    
    // Gói tin SA:MP Query (p,i,r,c,x) thường < 20 bytes
    // Gói tin RakNet Handshake thường 546 bytes
    // Nếu gói tin nằm ngoài dải hợp lệ (ví cả gói 0 byte hoặc quá lớn) -> DROP
    if (len < 5 || len > 1460) {
        return XDP_DROP;
    }

    /* 2. Chặn các IP trong Blacklist (Dùng BPF Map - Sẽ implement sau) */
    
    return XDP_PASS;
}

char _license[] SEC("license") = "GPL";
