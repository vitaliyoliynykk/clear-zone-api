import numpy as np
import matplotlib.pyplot as plt
import matplotlib.ticker as ticker

ks = 10
kn = 200

delta = np.linspace(0, 1, 500)
voc_index = np.clip(np.log1p(delta * ks) * kn, 0, 500)

fig, ax = plt.subplots(figsize=(8, 5))

ax.plot(delta, voc_index, color='#3266ad', linewidth=2.5, label='VOC Index')
ax.axhline(y=500, color='#e24b4a', linewidth=1.5,
           linestyle='--', label='Максимум (500)')

ax.fill_between(delta, voc_index, alpha=0.08, color='#3266ad')

key_deltas = [0.0, 0.2, 0.5, 1.0]
key_labels = ['δ = 0', 'δ = 0.2', 'δ = 0.5', 'δ = 1.0']
for d, lbl in zip(key_deltas, key_labels):
    val = float(np.clip(np.log1p(d * ks) * kn, 0, 500))
    ax.plot(d, val, 'o', color='#3266ad', markersize=7, zorder=5)
    offset_x = 0.02
    offset_y = -28 if d == 1.0 else 12
    ax.annotate(
        f'{lbl}\n→ {val:.0f}',
        xy=(d, val),
        xytext=(d + offset_x, val + offset_y),
        fontsize=9,
        color='#444',
        arrowprops=dict(arrowstyle='->', color='#aaa', lw=1.0),
        bbox=dict(boxstyle='round,pad=0.3', fc='white', ec='#ddd', lw=0.8)
    )

ax.set_xlabel('Нормалізоване відхилення δ', fontsize=11)
ax.set_ylabel('VOC Index', fontsize=11)

ax.set_xlim(0, 1)
ax.set_ylim(0, 550)
ax.xaxis.set_major_formatter(ticker.FormatStrFormatter('%.1f'))
ax.yaxis.set_major_locator(ticker.MultipleLocator(100))
ax.grid(True, linestyle='--', alpha=0.4, linewidth=0.7)
ax.spines['top'].set_visible(False)
ax.spines['right'].set_visible(False)
ax.legend(fontsize=10, framealpha=0.9, loc='upper left')

plt.tight_layout()
plt.savefig('voc_index_chart.png', dpi=200,
            bbox_inches='tight', facecolor='white')
print("Збережено: voc_index_chart.png")