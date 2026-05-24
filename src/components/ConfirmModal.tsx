import React, { useMemo } from 'react';
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
          <Text style={s.title}>{title}</Text>
          <Text style={s.message}>{message}</Text>
          <View style={s.buttons}>
            <TouchableOpacity style={s.cancelBtn} onPress={onCancel}>
              <Text style={s.cancelText}>{cancelLabel}</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[s.confirmBtn, destructive && s.confirmBtnDestructive]}
              onPress={onConfirm}
            >
              <Text style={s.confirmText}>{confirmLabel}</Text>
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
