import { useLayoutEffect } from 'react';

const MIN_SCALE = 0.25;
const MAX_SCALE = 2;

export function useFitScale(signature: string, phone = false): void {
    useLayoutEffect(() => {
        if (!phone) {
            const wrapper = document.getElementById('chart-wrapper');
            if (wrapper) {
                wrapper.style.transform = '';
                wrapper.style.transformOrigin = '';
                wrapper.style.removeProperty('--fit-shrink');
            }
            return;
        }

        const fit = () => {
            const wrapper = document.getElementById('chart-wrapper');
            if (!wrapper || !wrapper.offsetWidth || !wrapper.offsetHeight) return;

            wrapper.style.setProperty('--fit-shrink', '0px');
            const style = getComputedStyle(wrapper);
            const marginX = (parseFloat(style.marginLeft) || 0) + (parseFloat(style.marginRight) || 0);
            const marginY = (parseFloat(style.marginTop) || 0) + (parseFloat(style.marginBottom) || 0);

            const availableW = document.documentElement.clientWidth - marginX;
            const availableH = document.documentElement.clientHeight - marginY;
            const fitScale = Math.min(availableW / wrapper.offsetWidth, availableH / wrapper.offsetHeight);
            const scale = Math.min(MAX_SCALE, Math.max(MIN_SCALE, fitScale));

            const shiftX = Math.max(0, (availableW - wrapper.offsetWidth * scale) / 2);

            wrapper.style.transformOrigin = 'top left';
            wrapper.style.transform = `translateX(${shiftX}px) scale(${scale})`;
            wrapper.style.setProperty('--fit-shrink', `${wrapper.offsetHeight * (1 - scale)}px`);
        };

        fit();
        const wrapper = document.getElementById('chart-wrapper');
        const observer = wrapper ? new ResizeObserver(fit) : null;
        if (wrapper) observer?.observe(wrapper);
        window.addEventListener('resize', fit);
        return () => {
            observer?.disconnect();
            window.removeEventListener('resize', fit);
        };
    }, [signature, phone]);
}