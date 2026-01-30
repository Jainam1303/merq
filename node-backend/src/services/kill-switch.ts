let killSwitchEnabled = false;

export const isKillSwitchEnabled = () => killSwitchEnabled;

export const setKillSwitch = (enabled: boolean) => {
  killSwitchEnabled = enabled;
};
