
document.addEventListener('DOMContentLoaded', () => {
    const exp = document.getElementById('exp');
    if (exp) {
        const badge = document.createElement('span');
        badge.style.marginLeft = '8px';
        badge.style.fontWeight = '600';
        const update = () => (badge.textContent = `${exp.value}/10`);
        update();
        exp.insertAdjacentElement('afterend', badge);
        exp.addEventListener('input', update);
    }

    const progress = document.querySelector('#enroll progress');
    const output = document.querySelector('#enroll output');
    if (progress && output) {
        const sync = () => (output.textContent = `Example output: ${progress.value}%`);
        sync();
        ['input', 'change'].forEach(ev => progress.addEventListener(ev, sync));
    }
});
