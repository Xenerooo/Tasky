import React, { useMemo } from 'react';
import { ThemedText } from '../components/ThemedText';
import { View, Text, Modal, TouchableOpacity, StyleSheet } from 'react-native';
import { useTheme, type ThemeColors } from '../theme/ThemeContext';

interface ConfirmModalProps {
  visible: boolean;
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  destructive?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

export default function ConfirmModal({
  visible,
  title,
  message,
  confirmLabel = 'Delete',
  cancelLabel = 'Cancel',
  destructive = true,
  onConfirm,
  onCancel,
}: ConfirmModalProps) {
  const { colors } = useTheme();
  const s = useMemo(() => styles(colors), [colors]);
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onCancel}>
      <View style={s.overlay}>
        <View style={s.content}>
          <ThemedText style={s.title}>{title}</ThemedText>
          <ThemedText style={s.message}>{message}</ThemedText>
          <View style={s.buttons}>
            <TouchableOpacity style={s.cancelBtn} onPress={onCancel}>
              <ThemedText style={s.cancelText}>{cancelLabel}</ThemedText>
            </TouchableOpacity>
            <TouchableOpacity
              style={[s.confirmBtn, destructive && s.confirmBtnDestructive]}
              onPress={onConfirm}
            >
              <ThemedText style={s.confirmText}>{confirmLabel}</ThemedText>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = (c: ThemeColors) => StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: c.overlay,
    justifyContent: 'center',
    alignItems: 'center',
  },
  content: {
    backgroundColor: c.surface,
    borderRadius: 16,
    padding: 24,
    width: '80%',
    maxWidth: 340,
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
    color: c.textPrimary,
    marginBottom: 8,
  },
  message: {
    fontSize: 14,
    color: c.textBody,
    lineHeight: 20,
    marginBottom: 20,
  },
  buttons: {
    flexDirection: 'row',
    gap: 10,
  },
  cancelBtn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 10,
    backgroundColor: c.screenBackground,
    alignItems: 'center',
  },
  cancelText: {
    fontSize: 15,
    fontWeight: '600',
    color: c.textTertiary,
  },
  confirmBtn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 10,
    backgroundColor: c.primary,
    alignItems: 'center',
  },
  confirmBtnDestructive: {
    backgroundColor: c.danger,
  },
  confirmText: {
    fontSize: 15,
    fontWeight: '600',
    color: c.textOnColor,
  },
});
